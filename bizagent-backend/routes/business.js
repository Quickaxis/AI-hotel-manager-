const express = require('express');
const router = express.Router();
const db = require('../services/db');
const sheets = require('../services/sheets');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// POST /api/business/setup
router.post('/setup', async (req, res) => {
  try {
    const { name, type, location, currency } = req.body;
    const userId = req.user.id;

    if (!name || !type) {
      return res.status(400).json({ success: false, error: 'Name and type required' });
    }

    const curr = currency || 'INR';

    // Check if business exists for user
    const existingResult = await db.query('SELECT * FROM businesses WHERE user_id = $1', [userId]);

    let business;
    if (existingResult.rows.length > 0) {
      // Update
      const updateResult = await db.query(
        'UPDATE businesses SET name = $1, type = $2, location = $3, currency = $4 WHERE user_id = $5 RETURNING *',
        [name, type, location, curr, userId]
      );
      business = updateResult.rows[0];
    } else {
      // Create Sheet
      const sheetId = await sheets.createSheet(name);
      
      // Insert
      const insertResult = await db.query(
        'INSERT INTO businesses (user_id, name, type, location, currency, sheet_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [userId, name, type, location, curr, sheetId]
      );
      business = insertResult.rows[0];
    }

    res.json({ success: true, business });
  } catch (error) {
    console.error('[business/setup] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/business/me
router.get('/me', async (req, res) => {
  try {
    const userId = req.user.id;
    const bizResult = await db.query('SELECT * FROM businesses WHERE user_id = $1', [userId]);
    
    if (bizResult.rows.length === 0) {
      return res.json({ success: true, business: null, products: [] });
    }

    const business = bizResult.rows[0];
    const prodResult = await db.query('SELECT name, price, unit FROM products WHERE business_id = $1', [business.id]);
    
    res.json({ success: true, business, products: prodResult.rows });
  } catch (error) {
    console.error('[business/me] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/business/products
router.post('/products', async (req, res) => {
  try {
    const { products } = req.body; // Array of { name, price, unit }
    const userId = req.user.id;

    if (!Array.isArray(products)) {
      return res.status(400).json({ success: false, error: 'products array required' });
    }

    const bizResult = await db.query('SELECT id, sheet_id FROM businesses WHERE user_id = $1', [userId]);
    if (bizResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Business not set up yet. Call /setup first.' });
    }

    const business = bizResult.rows[0];

    // Transaction begin
    await db.query('BEGIN');
    
    // Delete existing products
    await db.query('DELETE FROM products WHERE business_id = $1', [business.id]);
    
    // Insert new products
    for (const p of products) {
      await db.query(
        'INSERT INTO products (business_id, name, price, unit) VALUES ($1, $2, $3, $4)',
        [business.id, p.name, p.price, p.unit || 'unit']
      );
    }
    
    await db.query('COMMIT');

    // Update Google Sheet headers
    try {
      await sheets.updateSheetHeaders(business.sheet_id, products);
    } catch (sheetError) {
      console.warn("Failed to update sheet headers (might lack permissions or auth)", sheetError.message);
    }

    const prodResult = await db.query('SELECT name, price, unit FROM products WHERE business_id = $1', [business.id]);
    
    res.json({ success: true, products: prodResult.rows });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('[business/products] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
