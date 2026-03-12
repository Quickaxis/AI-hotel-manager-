const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../services/db');

// Admin Auth Middleware
const adminAuth = (req, res, next) => {
  const adminSecret = req.headers['x-admin-secret'];
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ success: false, error: 'Forbidden: Invalid Admin Secret' });
  }
  next();
};

router.use(adminAuth);

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const query = `
      SELECT u.id, u.name, u.email, u.phone, u.plan, u.is_active, u.last_login, u.created_at,
             b.name as business_name, b.type as business_type
      FROM users u
      LEFT JOIN businesses b ON u.id = b.user_id
      ORDER BY u.created_at DESC
    `;
    const result = await db.query(query);
    res.json({ success: true, users: result.rows });
  } catch (error) {
    console.error('[admin/users] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/admin/users/create
router.post('/users/create', async (req, res) => {
  try {
    const { name, email, password, phone, plan } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userPlan = plan || 'starter';

    const result = await db.query(
      `INSERT INTO users (name, email, password, phone, plan, created_by_admin, is_active) 
       VALUES ($1, $2, $3, $4, $5, true, true) RETURNING id, name, email, phone, plan, is_active, created_at`,
      [name, email, hashedPassword, phone, userPlan]
    );

    res.status(201).json({ success: true, user: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ success: false, error: 'Email already exists' });
    }
    console.error('[admin/users/create] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/admin/users/:id/activate
router.put('/users/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'UPDATE users SET is_active = true WHERE id = $1 RETURNING id, name, email, is_active',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('[admin/users/activate] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/admin/users/:id/deactivate
router.put('/users/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'UPDATE users SET is_active = false WHERE id = $1 RETURNING id, name, email, is_active',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('[admin/users/deactivate] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/admin/users/:id/reset-password
router.put('/users/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword) return res.status(400).json({ success: false, error: 'newPassword is required' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await db.query('UPDATE users SET password = $1 WHERE id = $2 RETURNING id', [hashedPassword, id]);
    
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'User not found' });
    
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('[admin/users/reset-password] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/admin/users/:id/plan
router.put('/users/:id/plan', async (req, res) => {
  try {
    const { id } = req.params;
    const { plan } = req.body;
    
    if (!['starter', 'growth', 'pro'].includes(plan)) {
      return res.status(400).json({ success: false, error: 'Invalid plan name' });
    }

    const result = await db.query(
      'UPDATE users SET plan = $1 WHERE id = $2 RETURNING id, name, email, plan',
      [plan, id]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'User not found' });
    
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('[admin/users/plan] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const usersResult = await db.query(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_users,
        SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactive_users,
        SUM(CASE WHEN plan = 'starter' THEN 1 ELSE 0 END) as starter_users,
        SUM(CASE WHEN plan = 'growth' THEN 1 ELSE 0 END) as growth_users,
        SUM(CASE WHEN plan = 'pro' THEN 1 ELSE 0 END) as pro_users
      FROM users
    `);
    
    const bizResult = await db.query('SELECT COUNT(*) as total_businesses FROM businesses');
    
    const stats = usersResult.rows[0];
    
    res.json({
      success: true,
      totalUsers: parseInt(stats.total_users || 0),
      activeUsers: parseInt(stats.active_users || 0),
      inactiveUsers: parseInt(stats.inactive_users || 0),
      totalBusinesses: parseInt(bizResult.rows[0].total_businesses || 0),
      planBreakdown: {
        starter: parseInt(stats.starter_users || 0),
        growth: parseInt(stats.growth_users || 0),
        pro: parseInt(stats.pro_users || 0)
      }
    });
  } catch (error) {
    console.error('[admin/stats] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
