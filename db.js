const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

const teams = [
  { name: "Fransa", flag: "🇫🇷", odds_american: "+450", odds_decimal: 5.5, prob: 15.4, tier: 1 },
  { name: "İspanya", flag: "🇪🇸", odds_american: "+500", odds_decimal: 6.0, prob: 14.3, tier: 1 },
  { name: "İngiltere", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", odds_american: "+650", odds_decimal: 7.5, prob: 11.8, tier: 1 },
  { name: "Brezilya", flag: "🇧🇷", odds_american: "+800", odds_decimal: 9.0, prob: 10.0, tier: 1 },
  { name: "Arjantin", flag: "🇦🇷", odds_american: "+800", odds_decimal: 9.0, prob: 10.0, tier: 1 },
  { name: "Portekiz", flag: "🇵🇹", odds_american: "+1000", odds_decimal: 11.0, prob: 8.3, tier: 2 },
  { name: "Almanya", flag: "🇩🇪", odds_american: "+1400", odds_decimal: 15.0, prob: 6.3, tier: 2 },
  { name: "Hollanda", flag: "🇳🇱", odds_american: "+2000", odds_decimal: 21.0, prob: 4.5, tier: 2 },
  { name: "Norveç", flag: "🇳🇴", odds_american: "+2500", odds_decimal: 26.0, prob: 3.7, tier: 2 },
  { name: "Belçika", flag: "🇧🇪", odds_american: "+3300", odds_decimal: 34.0, prob: 2.9, tier: 2 },
  { name: "Kolombiya", flag: "🇨🇴", odds_american: "+4000", odds_decimal: 41.0, prob: 2.4, tier: 3 },
  { name: "Fas", flag: "🇲🇦", odds_american: "+4000", odds_decimal: 41.0, prob: 2.4, tier: 3 },
  { name: "ABD", flag: "🇺🇸", odds_american: "+4000", odds_decimal: 41.0, prob: 2.4, tier: 3 },
  { name: "Japonya", flag: "🇯🇵", odds_american: "+5000", odds_decimal: 51.0, prob: 1.9, tier: 3 },
  { name: "Uruguay", flag: "🇺🇾", odds_american: "+5000", odds_decimal: 51.0, prob: 1.9, tier: 3 },
  { name: "Hırvatistan", flag: "🇭🇷", odds_american: "+6600", odds_decimal: 67.0, prob: 1.5, tier: 3 },
  { name: "Ekvador", flag: "🇪🇨", odds_american: "+6600", odds_decimal: 67.0, prob: 1.5, tier: 3 },
  { name: "Meksika", flag: "🇲🇽", odds_american: "+6600", odds_decimal: 67.0, prob: 1.5, tier: 3 },
  { name: "Senegal", flag: "🇸🇳", odds_american: "+6600", odds_decimal: 67.0, prob: 1.5, tier: 3 },
  { name: "İsveç", flag: "🇸🇪", odds_american: "+6600", odds_decimal: 67.0, prob: 1.5, tier: 3 },
  { name: "İsviçre", flag: "🇨🇭", odds_american: "+6600", odds_decimal: 67.0, prob: 1.5, tier: 3 },
  { name: "Türkiye", flag: "🇹🇷", odds_american: "+6600", odds_decimal: 67.0, prob: 1.5, tier: 3 },
  { name: "Avusturya", flag: "🇦🇹", odds_american: "+10000", odds_decimal: 101.0, prob: 1.0, tier: 3 },
  { name: "Kanada", flag: "🇨🇦", odds_american: "+15000", odds_decimal: 151.0, prob: 0.7, tier: 4 },
  { name: "Paraguay", flag: "🇵🇾", odds_american: "+15000", odds_decimal: 151.0, prob: 0.7, tier: 4 },
  { name: "Çek Cumhuriyeti", flag: "🇨🇿", odds_american: "+20000", odds_decimal: 201.0, prob: 0.5, tier: 4 },
  { name: "Fildişi Sahili", flag: "🇨🇮", odds_american: "+20000", odds_decimal: 201.0, prob: 0.5, tier: 4 },
  { name: "Cezayir", flag: "🇩🇿", odds_american: "+25000", odds_decimal: 251.0, prob: 0.4, tier: 4 },
  { name: "Bosna Hersek", flag: "🇧🇦", odds_american: "+25000", odds_decimal: 251.0, prob: 0.4, tier: 4 },
  { name: "Mısır", flag: "🇪🇬", odds_american: "+25000", odds_decimal: 251.0, prob: 0.4, tier: 4 },
  { name: "Gana", flag: "🇬🇭", odds_american: "+25000", odds_decimal: 251.0, prob: 0.4, tier: 4 },
  { name: "İran", flag: "🇮🇷", odds_american: "+25000", odds_decimal: 251.0, prob: 0.4, tier: 4 },
  { name: "Nijerya", flag: "🇳🇬", odds_american: "+25000", odds_decimal: 251.0, prob: 0.4, tier: 4 },
  { name: "Polonya", flag: "🇵🇱", odds_american: "+25000", odds_decimal: 251.0, prob: 0.4, tier: 4 },
  { name: "Katar", flag: "🇶🇦", odds_american: "+30000", odds_decimal: 301.0, prob: 0.3, tier: 4 },
  { name: "Suudi Arabistan", flag: "🇸🇦", odds_american: "+30000", odds_decimal: 301.0, prob: 0.3, tier: 4 },
  { name: "Güney Kore", flag: "🇰🇷", odds_american: "+30000", odds_decimal: 301.0, prob: 0.3, tier: 4 },
  { name: "Avustralya", flag: "🇦🇺", odds_american: "+30000", odds_decimal: 301.0, prob: 0.3, tier: 4 },
  { name: "Kamerun", flag: "🇨🇲", odds_american: "+35000", odds_decimal: 351.0, prob: 0.3, tier: 4 },
  { name: "Şili", flag: "🇨🇱", odds_american: "+35000", odds_decimal: 351.0, prob: 0.3, tier: 4 },
  { name: "Kosta Rika", flag: "🇨🇷", odds_american: "+35000", odds_decimal: 351.0, prob: 0.3, tier: 4 },
  { name: "Danimarka", flag: "🇩🇰", odds_american: "+35000", odds_decimal: 351.0, prob: 0.3, tier: 4 },
  { name: "Yunanistan", flag: "🇬🇷", odds_american: "+40000", odds_decimal: 401.0, prob: 0.2, tier: 4 },
  { name: "Honduras", flag: "🇭🇳", odds_american: "+50000", odds_decimal: 501.0, prob: 0.2, tier: 4 },
  { name: "Yeni Zelanda", flag: "🇳🇿", odds_american: "+50000", odds_decimal: 501.0, prob: 0.2, tier: 4 },
  { name: "Romanya", flag: "🇷🇴", odds_american: "+50000", odds_decimal: 501.0, prob: 0.2, tier: 4 },
  { name: "Ukrayna", flag: "🇺🇦", odds_american: "+50000", odds_decimal: 501.0, prob: 0.2, tier: 4 },
  { name: "Venezuela", flag: "🇻🇪", odds_american: "+60000", odds_decimal: 601.0, prob: 0.2, tier: 4 },
];

async function initDB() {
  await query(`
    CREATE TABLE IF NOT EXISTS teams (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      flag_emoji TEXT NOT NULL,
      odds_american TEXT NOT NULL,
      odds_decimal REAL NOT NULL,
      win_probability_pct REAL NOT NULL,
      tier INTEGER NOT NULL,
      is_available BOOLEAN DEFAULT TRUE
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      balance REAL DEFAULT 1000,
      selected_team_id INTEGER REFERENCES teams(id),
      is_admin BOOLEAN DEFAULT FALSE,
      draft_order INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS bets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      team_id INTEGER NOT NULL REFERENCES teams(id),
      amount REAL NOT NULL,
      potential_payout REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      placed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS tournament (
      id INTEGER PRIMARY KEY DEFAULT 1,
      status TEXT DEFAULT 'draft',
      winner_team_id INTEGER REFERENCES teams(id),
      draft_current_pick INTEGER DEFAULT 1,
      draft_status TEXT DEFAULT 'waiting'
    )
  `);

  // Seed teams
  const { rows: teamCount } = await query('SELECT COUNT(*) as count FROM teams');
  if (parseInt(teamCount[0].count) === 0) {
    for (const t of teams) {
      await query(
        'INSERT INTO teams (name, flag_emoji, odds_american, odds_decimal, win_probability_pct, tier) VALUES ($1,$2,$3,$4,$5,$6)',
        [t.name, t.flag, t.odds_american, t.odds_decimal, t.prob, t.tier]
      );
    }
  }

  // Seed tournament row
  const { rows: tourCount } = await query('SELECT COUNT(*) as count FROM tournament');
  if (parseInt(tourCount[0].count) === 0) {
    await query("INSERT INTO tournament (id, status, draft_current_pick, draft_status) VALUES (1, 'draft', 1, 'waiting')");
  }

  // Seed admin user
  const { rows: adminRows } = await query("SELECT COUNT(*) as count FROM users WHERE username = 'admin'");
  if (parseInt(adminRows[0].count) === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await query(
      "INSERT INTO users (username, password_hash, display_name, is_admin) VALUES ('admin', $1, 'Administrator', TRUE)",
      [hash]
    );
  }

  console.log('DB initialized');
}

module.exports = { query, initDB };
