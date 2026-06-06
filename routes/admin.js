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

router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT u.id, u.username, u.display_name, u.balance, u.is_admin, u.created_at,
             t.name as team_name, t.flag_emoji, t.tier
      FROM users u
      LEFT JOIN teams t ON u.selected_team_id = t.id
      ORDER BY u.created_at ASC
    `);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

router.post('/tournament', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status, winner_team_id } = req.body;
    const validStatuses = ['draft', 'active', 'finished'];
    if (!validStatuses.includes(status)) return res.json({ success: false, error: 'Geçersiz durum' });

    if (status === 'finished') {
      if (!winner_team_id) return res.json({ success: false, error: 'Kazananı belirtmek zorunlu' });

      const { rows: teamRows } = await query('SELECT * FROM teams WHERE id = $1', [winner_team_id]);
      if (!teamRows.length) return res.json({ success: false, error: 'Takım bulunamadı' });

      await query('UPDATE tournament SET status = $1, winner_team_id = $2 WHERE id = 1', [status, winner_team_id]);
      await query("UPDATE bets SET status = CASE WHEN team_id = $1 THEN 'won' ELSE 'lost' END WHERE status = 'pending'", [winner_team_id]);

      const { rows: winBets } = await query("SELECT * FROM bets WHERE team_id = $1 AND status = 'won'", [winner_team_id]);
      for (const bet of winBets) {
        await query('UPDATE users SET balance = balance + $1 WHERE id = $2', [bet.potential_payout, bet.user_id]);
      }
    } else {
      await query('UPDATE tournament SET status = $1, winner_team_id = NULL WHERE id = 1', [status]);
    }

    const { rows } = await query('SELECT * FROM tournament WHERE id = 1');
    res.json({ success: true, data: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    if (targetId === req.session.userId) return res.status(403).json({ success: false, error: 'Kendinizi silemezsiniz' });

    const { rows } = await query('SELECT * FROM users WHERE id = $1', [targetId]);
    if (!rows.length) return res.json({ success: false, error: 'Kullanıcı bulunamadı' });
    if (rows[0].is_admin) return res.status(403).json({ success: false, error: 'Admin hesapları silinemez' });

    if (rows[0].selected_team_id) {
      await query('UPDATE teams SET is_available = TRUE WHERE id = $1', [rows[0].selected_team_id]);
    }
    await query('DELETE FROM bets WHERE user_id = $1', [targetId]);
    await query('DELETE FROM users WHERE id = $1', [targetId]);

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

router.post('/reset-team', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.json({ success: false, error: 'user_id gerekli' });

    const { rows: userRows } = await query('SELECT * FROM users WHERE id = $1', [user_id]);
    if (!userRows.length) return res.json({ success: false, error: 'Kullanıcı bulunamadı' });
    const user = userRows[0];

    if (user.selected_team_id) {
      await query('UPDATE teams SET is_available = TRUE WHERE id = $1', [user.selected_team_id]);
    }
    await query('UPDATE users SET selected_team_id = NULL WHERE id = $1', [user_id]);

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

router.post('/users/:id/select-team', requireAuth, requireAdmin, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const { team_id } = req.body;
    if (!team_id) return res.json({ success: false, error: 'team_id gerekli' });

    const { rows: userRows } = await query('SELECT * FROM users WHERE id = $1', [targetId]);
    if (!userRows.length) return res.json({ success: false, error: 'Kullanıcı bulunamadı' });
    const user = userRows[0];
    if (user.selected_team_id) return res.json({ success: false, error: 'Kullanıcının zaten bir takımı var' });

    const { rows: teamRows } = await query('SELECT * FROM teams WHERE id = $1 AND is_available = TRUE', [team_id]);
    if (!teamRows.length) return res.json({ success: false, error: 'Bu takım mevcut değil' });

    await query('UPDATE users SET selected_team_id = $1 WHERE id = $2', [team_id, targetId]);
    await query('UPDATE teams SET is_available = FALSE WHERE id = $1', [team_id]);

    const { rows: tourRows } = await query('SELECT * FROM tournament WHERE id = 1');
    const tournament = tourRows[0];
    if (tournament?.draft_status === 'active' && user.draft_order != null) {
      const { advanceToNextPick } = require('./draft');
      await advanceToNextPick(user.draft_order);
    }

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

router.post('/users/:id/balance', requireAuth, requireAdmin, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const { amount } = req.body;
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return res.json({ success: false, error: 'Geçerli bir miktar girin' });
    }
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [targetId]);
    if (!rows.length) return res.json({ success: false, error: 'Kullanıcı bulunamadı' });
    if (rows[0].is_admin) return res.status(403).json({ success: false, error: 'Admin bakiyesi değiştirilemez' });
    const newBalance = rows[0].balance + Number(amount);
    if (newBalance < 0) return res.json({ success: false, error: 'Bakiye 0\'ın altına düşemez' });
    const { rows: updated } = await query(
      'UPDATE users SET balance = $1 WHERE id = $2 RETURNING id, display_name, balance',
      [newBalance, targetId]
    );
    res.json({ success: true, data: updated[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

router.delete('/bets/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const betId = parseInt(req.params.id);
    const { rows } = await query('SELECT * FROM bets WHERE id = $1', [betId]);
    if (!rows.length) return res.json({ success: false, error: 'Bahis bulunamadı' });
    if (rows[0].status !== 'pending') return res.json({ success: false, error: 'Yalnızca bekleyen bahisler iptal edilebilir' });
    await query('UPDATE users SET balance = balance + $1 WHERE id = $2', [rows[0].amount, rows[0].user_id]);
    await query('DELETE FROM bets WHERE id = $1', [betId]);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

router.get('/tournament', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM tournament WHERE id = 1');
    res.json({ success: true, data: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

module.exports = router;
