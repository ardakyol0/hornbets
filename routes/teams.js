const express = require('express');
const { query } = require('../db');
const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ success: false, error: 'Giriş yapılmamış' });
  next();
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM teams ORDER BY tier, odds_decimal');
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

router.post('/select', requireAuth, async (req, res) => {
  try {
    const { team_id } = req.body;
    if (!team_id) return res.json({ success: false, error: 'team_id gerekli' });

    const { rows: userRows } = await query('SELECT * FROM users WHERE id = $1', [req.session.userId]);
    const user = userRows[0];
    if (user.selected_team_id) return res.json({ success: false, error: 'Zaten bir takımın var' });

    const { rows: tourRows } = await query('SELECT * FROM tournament WHERE id = 1');
    const tournament = tourRows[0];

    if (tournament) {
      const ds = tournament.draft_status;
      if (ds === 'waiting') return res.json({ success: false, error: 'Draft henüz başlamadı' });
      if (ds === 'finished') return res.json({ success: false, error: 'Draft tamamlandı' });
      if (ds === 'active') {
        if (user.draft_order == null) return res.json({ success: false, error: 'Draft sıran atanmamış' });
        if (user.draft_order !== tournament.draft_current_pick) {
          return res.json({ success: false, error: 'Şu an sıra sende değil' });
        }
      }
      if (tournament.status === 'active' || tournament.status === 'finished') {
        return res.json({ success: false, error: 'Takım seçimi kapalı' });
      }
    }

    const { rows: teamRows } = await query('SELECT * FROM teams WHERE id = $1 AND is_available = TRUE', [team_id]);
    if (!teamRows.length) return res.json({ success: false, error: 'Bu takım mevcut değil' });
    const team = teamRows[0];

    await query('UPDATE users SET selected_team_id = $1 WHERE id = $2', [team_id, req.session.userId]);
    await query('UPDATE teams SET is_available = FALSE WHERE id = $1', [team_id]);

    // Advance draft if active
    if (tournament && tournament.draft_status === 'active') {
      const { advanceToNextPick } = require('./draft');
      await advanceToNextPick(user.draft_order);
    }

    res.json({ success: true, data: { team } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

module.exports = router;
