const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../services/db');
const authMiddleware = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, error: 'Account deactivated. Please contact us on WhatsApp to reactivate.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Update last login
    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { id: user.id, email: user.email, plan: user.plan }, 
      process.env.JWT_SECRET, 
      { expiresIn: '30d' }
    );

    // Get business context
    const businessResult = await db.query('SELECT * FROM businesses WHERE user_id = $1', [user.id]);
    const business = businessResult.rows.length > 0 ? businessResult.rows[0] : null;

    let products = [];
    if (business) {
      const prodResult = await db.query('SELECT name, price, unit FROM products WHERE business_id = $1', [business.id]);
      products = prodResult.rows;
      business.products = products;
    }

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      token,
      user: userWithoutPassword,
      business
    });
  } catch (error) {
    console.error('[auth/login] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/auth/me (Instructions say POST but usually it is GET, I will use POST as instructed)
router.post('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userResult = await db.query('SELECT id, name, email, phone, plan, is_active, last_login, created_at FROM users WHERE id = $1', [userId]);
    
    const businessResult = await db.query('SELECT * FROM businesses WHERE user_id = $1', [userId]);
    const business = businessResult.rows.length > 0 ? businessResult.rows[0] : null;

    let products = [];
    if (business) {
      const prodResult = await db.query('SELECT name, price, unit FROM products WHERE business_id = $1', [business.id]);
      products = prodResult.rows;
      business.products = products;
    }

    res.json({
      success: true,
      user: userResult.rows[0],
      business
    });
  } catch (error) {
    console.error('[auth/me] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Both current and new password required' });
    }

    const userResult = await db.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const hashedCurrentPassword = userResult.rows[0].password;

    const isMatch = await bcrypt.compare(currentPassword, hashedCurrentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Incorrect current password' });
    }

    const newHashed = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [newHashed, req.user.id]);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('[auth/change-password] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
