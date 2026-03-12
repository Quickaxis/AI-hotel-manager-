const express = require('express');
const router = express.Router();
const db = require('../services/db');
const sheets = require('../services/sheets');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

const getBusiness = async (userId) => {
  const bizResult = await db.query('SELECT * FROM businesses WHERE user_id = $1', [userId]);
  if (bizResult.rows.length === 0) return null;
  return bizResult.rows[0];
};

// GET /api/data/today
router.get('/today', async (req, res) => {
  try {
    const business = await getBusiness(req.user.id);
    if (!business) return res.status(404).json({ success: false, error: 'Business not found' });
    
    let todayRows = [];
    try {
      todayRows = await sheets.getTodayRow(business.sheet_id);
    } catch (e) {
      console.warn("Sheet read error:", e.message);
    }
    
    // Could be an array of rows if multiple logs, or we can just send the array back
    res.json({ success: true, data: todayRows });
  } catch (error) {
    console.error('[data/today] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/data/month?month=2026-03
router.get('/month', async (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM
    const business = await getBusiness(req.user.id);
    if (!business) return res.status(404).json({ success: false, error: 'Business not found' });
    
    let allRows = [];
    try {
      allRows = await sheets.getAllRows(business.sheet_id);
    } catch (e) {
      console.warn("Sheet read error:", e.message);
    }
    
    let monthRows = allRows;
    if (month) {
      const [y, m] = month.split('-');
      monthRows = allRows.filter(row => {
        const dateStr = row['Date']; // DD/MM/YYYY
        if (!dateStr) return false;
        const parts = dateStr.split('/');
        if (parts.length === 3) {
           return parts[2] === y && parts[1] === m;
        }
        return false;
      });
    }

    res.json({ success: true, data: monthRows });
  } catch (error) {
    console.error('[data/month] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/data/summary
router.get('/summary', async (req, res) => {
  try {
    const business = await getBusiness(req.user.id);
    if (!business) return res.status(404).json({ success: false, error: 'Business not found' });
    
    let allRows = [];
    try {
      allRows = await sheets.getAllRows(business.sheet_id);
    } catch (e) {
       console.warn("Sheet read error:", e.message);
    }
    
    const todayDate = new Date().toLocaleDateString('en-GB');
    const thisMonth = new Date().getMonth() + 1; // 1-12
    const thisYear = new Date().getFullYear();

    let todayRevenue = 0;
    let monthRevenue = 0;
    let totalRevenue = 0;
    let monthDaysLogged = new Set();
    let totalDaysLogged = new Set();
    
    let dailyAggregates = {};
    let productAggregates = {};
    
    // Omit Date, Total Revenue, Notes to find products
    const fixedCols = ['Date', 'Total Revenue', 'Notes'];

    for (const row of allRows) {
       const rawRev = row['Total Revenue'] || 0;
       const rev = typeof rawRev === 'string' ? parseFloat(rawRev.replace(/[^0-9.-]+/g,"")) : parseFloat(rawRev);
       const valueToAdd = isNaN(rev) ? 0 : rev;
       
       totalRevenue += valueToAdd;
       
       const dateStr = row['Date'];
       if (dateStr) {
          totalDaysLogged.add(dateStr);
          
          if (!dailyAggregates[dateStr]) dailyAggregates[dateStr] = 0;
          dailyAggregates[dateStr] += valueToAdd;
          
          if (dateStr === todayDate) {
             todayRevenue += valueToAdd;
          }
          
          const parts = dateStr.split('/');
          if (parts.length === 3 && parseInt(parts[1]) === thisMonth && parseInt(parts[2]) === thisYear) {
             monthRevenue += valueToAdd;
             monthDaysLogged.add(dateStr);
          }
       }
       
       // Process products
       Object.keys(row).forEach(key => {
          if (!fixedCols.includes(key)) {
             const qtyStr = row[key] || 0;
             const qty = parseFloat(qtyStr);
             if (!isNaN(qty) && qty > 0) {
                if (!productAggregates[key]) productAggregates[key] = 0;
                // Since sheet doesn't naturally store product price easily, 
                // we'll just track quantity. Instruct says "totalRevenue" for best product.
                // We don't have row-level price, but we have quantity.
                // We'll approximate by fetching products table prices.
                productAggregates[key] += qty;
             }
          }
       });
    }
    
    // Find best day
    let bestDay = { date: '', revenue: 0 };
    for (const [date, rev] of Object.entries(dailyAggregates)) {
       if (rev > bestDay.revenue) {
          bestDay = { date, revenue: rev };
       }
    }
    
    // Fetch product prices to calculate product revenue stats
    const prodResult = await db.query('SELECT name, price FROM products WHERE business_id = $1', [business.id]);
    const priceMap = {};
    prodResult.rows.forEach(p => { priceMap[p.name] = p.price; });
    
    let topProduct = { name: '', totalRevenue: 0 };
    for (const [prodName, totalQty] of Object.entries(productAggregates)) {
       const price = parseFloat(priceMap[prodName]) || 0;
       const pRev = totalQty * price;
       if (pRev > topProduct.totalRevenue) {
          topProduct = { name: prodName, totalRevenue: pRev };
       }
    }

    res.json({
      success: true,
      summary: {
        todayRevenue,
        monthRevenue,
        monthDaysLogged: monthDaysLogged.size,
        bestDay,
        topProduct,
        totalRevenue,
        totalDaysLogged: totalDaysLogged.size
      }
    });
  } catch (error) {
    console.error('[data/summary] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/data/history
router.get('/history', async (req, res) => {
  try {
    const business = await getBusiness(req.user.id);
    if (!business) return res.status(404).json({ success: false, error: 'Business not found' });
    
    const messages = await db.query(
      'SELECT id, role, content, action_type, created_at FROM chat_history WHERE business_id = $1 ORDER BY created_at ASC LIMIT 20', 
      [business.id]
    );

    const parsedMessages = messages.rows.map(m => {
       if (m.role === 'assistant') {
          try {
             return { ...m, content: JSON.parse(m.content) };
          } catch (e) {
             return m;
          }
       }
       return m;
    });

    res.json({ success: true, history: parsedMessages });
  } catch (error) {
    console.error('[data/history] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
