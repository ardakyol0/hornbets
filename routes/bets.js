const express = require('express');
const { query } = require('../db');
const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ success: false, error: 'Giriş yapılmamış' });
  next();
}

async function requireAdmin(req, res, next) {
  try {
    const { rows } = await query('SELECT is_admin FROM users WHERE id = $1', [req.session.userId]);
    if (!rows.length || !rows[0].is_admin) return res.status(403).json({ success: false, error: 'Admin only' });
    next();
  } catch (e) {
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT b.*, t.name as team_name, t.flag_emoji, t.odds_decimal
      FROM bets b JOIN teams t ON b.team_id = t.id
      WHERE b.user_id = $1
      ORDER BY b.placed_at DESC
    `, [req.session.userId]);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { team_id, amount } = req.body;
    if (!team_id || !amount) return res.json({ success: false, error: 'team_id ve amount gerekli' });
    if (amount <= 0) return res.json({ success: false, error: 'Miktar pozitif olmalı' });

    const { rows: tourRows } = await query('SELECT status FROM tournament WHERE id = 1');
    const tournament = tourRows[0];
    if (tournament && tournament.status !== 'draft') return res.json({ success: false, error: 'Bahisler kapalı' });

    const { rows: userRows } = await query('SELECT * FROM users WHERE id = $1', [req.session.userId]);
    const user = userRows[0];
    if (user.balance < amount) return res.json({ success: false, error: 'Yetersiz bakiye' });

    const { rows: teamRows } = await query('SELECT * FROM teams WHERE id = $1', [team_id]);
    if (!teamRows.length) return res.json({ success: false, error: 'Takım bulunamadı' });
    const team = teamRows[0];

    const potential_payout = parseFloat((amount * team.odds_decimal).toFixed(2));

    await query('UPDATE users SET balance = balance - $1 WHERE id = $2', [amount, req.session.userId]);
    const { rows: betRows } = await query(
      'INSERT INTO bets (user_id, team_id, amount, potential_payout) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.session.userId, team_id, amount, potential_payout]
    );

    res.json({ success: true, data: { id: betRows[0].id, team_name: team.name, amount, potential_payout } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

router.get('/all', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT b.*, u.username, u.display_name, t.name as team_name, t.flag_emoji
      FROM bets b
      JOIN users u ON b.user_id = u.id
      JOIN teams t ON b.team_id = t.id
      ORDER BY b.placed_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

module.exports = router;
