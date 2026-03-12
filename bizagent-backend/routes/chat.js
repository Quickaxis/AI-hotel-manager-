const express = require('express');
const router = express.Router();
const db = require('../services/db');
const sheets = require('../services/sheets');
const gemini = require('../services/gemini');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// POST /api/chat
router.post('/', async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.id;

    if (!message) {
      return res.status(400).json({ success: false, error: 'message Required' });
    }

    // 1. Fetch user's business + products
    const bizResult = await db.query('SELECT * FROM businesses WHERE user_id = $1', [userId]);
    if (bizResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Business not found. Please setup business first.' });
    }
    const business = bizResult.rows[0];

    const prodResult = await db.query('SELECT name, price, unit FROM products WHERE business_id = $1', [business.id]);
    business.products = prodResult.rows;

    // 2. Fetch all sheet rows
    let sheetData = [];
    try {
      sheetData = await sheets.getAllRows(business.sheet_id);
    } catch (err) {
      console.warn('Failed to fetch sheet data for context', err.message);
    }

    // 3. Fetch last 10 chat messages
    const chatHistResult = await db.query(
      'SELECT role, content FROM chat_history WHERE business_id = $1 ORDER BY created_at DESC LIMIT 10', 
      [business.id]
    );
    const chatHistory = chatHistResult.rows.reverse();

    // 4. Call gemini
    const responseData = await gemini.chat(message, business, sheetData, chatHistory);

    // 5. If log action -> append row
    if (responseData.action === 'log' && responseData.data) {
      try {
        await sheets.appendSalesRow(business.sheet_id, business.products, responseData.data, responseData.data.note);
      } catch (sheetError) {
        console.error('Failed to append row to Google sequence', sheetError.message);
      }
    }

    // 6. Save messages to DB
    await db.query(
      'INSERT INTO chat_history (business_id, role, content, action_type) VALUES ($1, $2, $3, $4)',
      [business.id, 'user', message, null]
    );

    await db.query(
      'INSERT INTO chat_history (business_id, role, content, action_type) VALUES ($1, $2, $3, $4)',
      [business.id, 'assistant', JSON.stringify(responseData), responseData.action]
    );

    res.json({ success: true, response: responseData });
  } catch (error) {
    console.error('[chat] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
