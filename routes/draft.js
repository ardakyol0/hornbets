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

async function advanceToNextPick(currentPick) {
  const { rows: ordered } = await query(
    'SELECT id, draft_order, selected_team_id FROM users WHERE draft_order IS NOT NULL AND is_admin = FALSE ORDER BY draft_order ASC'
  );
  if (!ordered.length) return;

  const remaining = ordered.filter(u => !u.selected_team_id && u.draft_order > currentPick);
  if (remaining.length === 0) {
    await query("UPDATE tournament SET draft_status = 'finished' WHERE id = 1");
  } else {
    await query('UPDATE tournament SET draft_current_pick = $1 WHERE id = 1', [remaining[0].draft_order]);
  }
}

// GET /api/draft/status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const { rows: tourRows } = await query('SELECT * FROM tournament WHERE id = 1');
    const tournament = tourRows[0];
    const { rows: meRows } = await query(
      'SELECT id, draft_order, selected_team_id FROM users WHERE id = $1', [req.session.userId]
    );
    const me = meRows[0];

    const { rows: ordered } = await query(`
      SELECT u.id, u.display_name, u.username, u.draft_order, u.selected_team_id,
             t.name as team_name, t.flag_emoji
      FROM users u
      LEFT JOIN teams t ON u.selected_team_id = t.id
      WHERE u.draft_order IS NOT NULL AND u.is_admin = FALSE
      ORDER BY u.draft_order ASC
    `);

    const currentUser = ordered.find(u => u.draft_order === tournament.draft_current_pick) || null;

    res.json({
      success: true,
      data: {
        draft_status: tournament.draft_status,
        draft_current_pick: tournament.draft_current_pick,
        current_user: currentUser,
        my_draft_order: me.draft_order,
        my_selected_team_id: me.selected_team_id,
        is_my_turn: tournament.draft_status === 'active' && me.draft_order === tournament.draft_current_pick,
        ordered_users: ordered,
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

// POST /api/admin/draft/order
router.post('/order', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { users } = req.body;
    if (!Array.isArray(users)) return res.json({ success: false, error: 'users dizisi gerekli' });

    await query('UPDATE users SET draft_order = NULL WHERE is_admin = FALSE');
    for (const { id, draft_order } of users) {
      await query('UPDATE users SET draft_order = $1 WHERE id = $2', [draft_order, id]);
    }
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

// POST /api/admin/draft/start
router.post('/start', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT draft_order FROM users WHERE draft_order IS NOT NULL AND is_admin = FALSE ORDER BY draft_order ASC LIMIT 1'
    );
    if (!rows.length) return res.json({ success: false, error: 'Draft sırası atanmamış. Önce sıra ata.' });

    await query(
      "UPDATE tournament SET draft_status = 'active', draft_current_pick = $1 WHERE id = 1",
      [rows[0].draft_order]
    );
    res.json({ success: true, data: { draft_status: 'active', draft_current_pick: rows[0].draft_order } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

// POST /api/admin/draft/next  (skip current pick)
router.post('/next', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows: tourRows } = await query('SELECT * FROM tournament WHERE id = 1');
    const tournament = tourRows[0];
    if (tournament.draft_status !== 'active') return res.json({ success: false, error: 'Draft aktif değil' });

    await advanceToNextPick(tournament.draft_current_pick);
    const { rows: updated } = await query('SELECT draft_current_pick, draft_status FROM tournament WHERE id = 1');
    res.json({ success: true, data: updated[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

// POST /api/admin/draft/reset
router.post('/reset', requireAuth, requireAdmin, async (req, res) => {
  try {
    await query("UPDATE tournament SET draft_status = 'waiting', draft_current_pick = 1 WHERE id = 1");
    const { rows: users } = await query(
      'SELECT id, selected_team_id FROM users WHERE is_admin = FALSE AND selected_team_id IS NOT NULL'
    );
    for (const u of users) {
      await query('UPDATE teams SET is_available = TRUE WHERE id = $1', [u.selected_team_id]);
      await query('UPDATE users SET selected_team_id = NULL WHERE id = $1', [u.id]);
    }
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

module.exports = { router, advanceToNextPick };
