const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ success: false, error: 'Kullanıcı adı ve şifre gerekli' });

    const { rows } = await query('SELECT * FROM users WHERE username = $1', [username]);
    const user = rows[0];
    if (!user) return res.json({ success: false, error: 'Geçersiz kimlik bilgileri' });

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return res.json({ success: false, error: 'Geçersiz kimlik bilgileri' });

    req.session.userId = user.id;
    res.json({ success: true, data: { id: user.id, username: user.username, display_name: user.display_name, is_admin: user.is_admin } });
  } catch (e) {
    console.error(e);
    res.json({ success: false, error: 'Sunucu hatası' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, display_name } = req.body;
    if (!username || !password || !display_name) return res.json({ success: false, error: 'Tüm alanlar gerekli' });

    const { rows: existing } = await query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.length) return res.json({ success: false, error: 'Bu kullanıcı adı alınmış' });

    const hash = bcrypt.hashSync(password, 10);
    const { rows } = await query(
      'INSERT INTO users (username, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id',
      [username, hash, display_name]
    );
    req.session.userId = rows[0].id;
    res.json({ success: true, data: { id: rows[0].id, username, display_name } });
  } catch (e) {
    console.error(e);
    res.json({ success: false, error: 'Kayıt başarısız' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

router.get('/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ success: false, error: 'Giriş yapılmamış' });
  try {
    const { rows } = await query(
      'SELECT id, username, display_name, balance, selected_team_id, is_admin FROM users WHERE id = $1',
      [req.session.userId]
    );
    if (!rows.length) return res.status(401).json({ success: false, error: 'Kullanıcı bulunamadı' });
    res.json({ success: true, data: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Sunucu hatası' });
  }
});

module.exports = router;
