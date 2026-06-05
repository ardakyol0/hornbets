const express = require('express');
const { query } = require('../db');
const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ success: false, error: 'Giriş yapılmamış' });
  next();
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        u.id, u.username, u.display_name, u.balance,
        t.id as team_id, t.name as team_name, t.flag_emoji,
        t.odds_american, t.odds_decimal, t.win_probability_pct, t.tier,
        COALESCE(SUM(b.amount), 0) as total_bet,
        COALESCE(SUM(b.potential_payout), 0) as total_payout
      FROM users u
      LEFT JOIN teams t ON u.selected_team_id = t.id
      LEFT JOIN bets b ON u.id = b.user_id
      WHERE u.is_admin = FALSE
      GROUP BY u.id, t.id
      ORDER BY t.win_probability_pct DESC NULLS LAST, total_payout DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

module.exports = router;
