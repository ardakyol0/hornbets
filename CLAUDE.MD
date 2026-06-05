# hornBETS — FIFA World Cup 2026 Private Betting Platform

20 arkadaş için özel bahis platformu. Herkes bir milli takım seçer, kimin kazanacağına dair bahis yapar.

---

## TECH STACK

- **Backend:** Node.js + Express (REST API)
- **Database:** PostgreSQL (via `pg` module)
- **Frontend:** Vanilla HTML/CSS/JS (Express tarafından statik olarak servis edilir)
- **Auth:** `express-session` + `bcryptjs` şifre hash'leme
- **Session secret:** `"hornbets-secret-2026"` (hardcoded)

---

## PROJECT STRUCTURE

```text
hornbets/
├── server.js              # Express uygulama giriş noktası
├── db.js                  # PostgreSQL bağlantısı + seed data
├── routes/
│   ├── auth.js            # login, logout, register, /me
│   ├── teams.js           # takım listesi, takım seçimi
│   ├── bets.js            # bahis koy, bahislerim, tüm bahisler (admin)
│   ├── admin.js           # admin panel route'ları
│   ├── draft.js           # draft sırası, draft başlat/ilerlet/sıfırla
│   └── leaderboard.js     # genel sıralama
├── public/
│   ├── index.html         # Giriş / kayıt sayfası
│   ├── dashboard.html     # Kullanıcı dashboard'u
│   ├── teams.html         # Takım seçim sayfası (draft sırasında)
│   ├── bet.html           # Bahis koy sayfası
│   ├── leaderboard.html   # Canlı sıralama
│   ├── admin.html         # Admin paneli (3 sekme)
│   ├── style.css          # Global stiller
│   └── app.js             # Frontend yardımcı fonksiyonlar (apiGet, apiPost, badge'ler)
├── hornbets.db            # SQLite DB dosyası (geliştirme kalıntısı, artık kullanılmıyor)
├── package.json
└── README.md
```

---

## DATABASE SCHEMA

### users

- `id` SERIAL PRIMARY KEY
- `username` TEXT UNIQUE
- `password_hash` TEXT (bcrypt)
- `display_name` TEXT
- `balance` REAL DEFAULT 1000
- `selected_team_id` INTEGER FK → teams.id (nullable)
- `is_admin` BOOLEAN DEFAULT FALSE
- `draft_order` INTEGER (nullable, draft sıralaması için)
- `created_at` TIMESTAMPTZ DEFAULT NOW()

### teams

- `id` SERIAL PRIMARY KEY
- `name` TEXT (Türkçe isimler: "Fransa", "İspanya" vb.)
- `flag_emoji` TEXT
- `odds_american` TEXT (örn: "+450")
- `odds_decimal` REAL (örn: 5.5)
- `win_probability_pct` REAL (örn: 15.4)
- `tier` INTEGER 1-4 (1=favori, 2=rakip, 3=karanlık at, 4=uzun ihtimal)
- `is_available` BOOLEAN DEFAULT TRUE

### bets

- `id` SERIAL PRIMARY KEY
- `user_id` INTEGER FK → users.id
- `team_id` INTEGER FK → teams.id
- `amount` REAL
- `potential_payout` REAL (amount × odds_decimal, 2 ondalık)
- `status` TEXT: 'pending' | 'won' | 'lost'
- `placed_at` TIMESTAMPTZ DEFAULT NOW()

### tournament

- `id` INTEGER PRIMARY KEY DEFAULT 1
- `status` TEXT: 'draft' | 'active' | 'finished'
- `winner_team_id` INTEGER FK → teams.id (nullable)
- `draft_current_pick` INTEGER (şu an hangi draft_order'ın sırası)
- `draft_status` TEXT: 'waiting' | 'active' | 'finished'

---

## TOURNAMENT AKIŞI

```text
draft → active → finished
```

### Draft Aşaması (status = 'draft')

- Kullanıcılar kayıt olur, bahis yapabilir (1000 coin ile başlar)
- Admin draft sırası atar → "Start Draft" → kullanıcılar sırayla takım seçer
- Takım seçimi: her takım yalnızca bir kişiye ait olabilir, seçilince kilitlenir
- Bahis: herkes istediği takıma bahis yapabilir (kendi takımı olmak zorunda değil)

### Active Aşaması (status = 'active')

- Bahisler kilitlenir, yeni bahis yapılamaz
- Takım seçimi de kilitlenir
- Turnuva maçları oynanır (uygulama dışında)

### Finished Aşaması (status = 'finished')

- Admin kazanan takımı seçer
- Kazanan takıma bahis yapanlar: status = 'won', bakiyelerine potential_payout eklenir
- Diğerleri: status = 'lost'
- Payout mantığı (admin.js): `UPDATE bets SET status = CASE WHEN team_id = $1 THEN 'won' ELSE 'lost' END WHERE status = 'pending'`

---

## ADMIN PANELİ (admin.html — 3 Sekme)

### 1. Users Sekmesi

- Tüm kullanıcıları, seçtikleri takımı ve bakiyelerini gösterir
- "Reset Team": kullanıcının takım seçimini sıfırlar (takım tekrar müsait olur)
- "Delete": kullanıcıyı siler (bahisleri de silinir, takımı serbest kalır)

### 2. Draft Sekmesi

- Draft sırası tablosu: her kullanıcı için sayı girişi
- "Shuffle": rastgele sıra oluşturur
- "Save": sıraları kaydeder (`POST /api/admin/draft/order`)
- "Start Draft": draft'ı başlatır (`POST /api/admin/draft/start`)
- "Skip Pick": mevcut sırayı geçer (`POST /api/admin/draft/next`)
- "Reset Draft": tüm seçimleri sıfırlar, draft'ı 'waiting' durumuna getirir

### 3. Tournament Sekmesi

- Mevcut turnuva durumunu gösterir
- "Draft" / "Active" / "Finish" butonları
- Finish: kazanan takım dropdown'ı + "Confirm Winner & Pay" butonu

---

## API ROUTE'LARI

```text
POST /api/auth/login              { username, password }
POST /api/auth/register           { username, password, display_name }
POST /api/auth/logout
GET  /api/auth/me

GET  /api/teams                   tüm takımlar + is_available flag'i
POST /api/teams/select            { team_id } — draft sırasında takım seç

GET  /api/bets                    mevcut kullanıcının bahisleri
POST /api/bets                    { team_id, amount } — bahis koy
GET  /api/bets/all                admin only — tüm bahisler

GET  /api/leaderboard             genel sıralama

GET  /api/admin/users             admin only
GET  /api/admin/tournament        admin only — mevcut turnuva durumu
POST /api/admin/tournament        { status, winner_team_id? }
POST /api/admin/reset-team        { user_id }
DELETE /api/admin/users/:id       kullanıcı sil

POST /api/admin/draft/order       { order: [{user_id, draft_order}] }
POST /api/admin/draft/start       draft'ı başlat
POST /api/admin/draft/next        mevcut sırayı geç
POST /api/admin/draft/reset       draft'ı sıfırla
```

---

## DESIGN SYSTEM

**Renkler:**

- Background: `#0a0a0a`
- Surface/Card: `#141414`
- Border: `#2a2a2a`
- Primary accent: `#F5C518` (FIFA altın sarısı)
- Primary hover: `#e6b800`
- Text primary: `#ffffff`
- Text secondary: `#888888`
- Success: `#22c55e`
- Danger: `#ef4444`
- Warning: `#f59e0b`

**Font:** `'Inter', sans-serif` (Google Fonts)

**Logo:** `horn**BETS**` — "horn" beyaz, "BETS" `#F5C518`

**Tier badge'leri:** Altın (Tier 1) / Gümüş (Tier 2) / Bronz (Tier 3) / Gri (Tier 4)

---

## ÖNEMLİ NOTLAR

- Tüm API yanıtları: `{ success: true, data: ... }` veya `{ success: false, error: "..." }`
- Login/register dışındaki tüm route'lar auth kontrolü yapar — yetkisizse 401 döner
- Frontend `fetch()` ile `credentials: 'include'` kullanır
- TypeScript yok — tüm kod plain JS
- Takım isimleri Türkçe (db.js seed data'sında)
- Bahis yalnızca tournament.status = 'draft' iken yapılabilir
- Takım seçimi yalnızca draft_status = 'active' ve kullanıcının draft_order sırası geldiyse yapılabilir
- Admin kullanıcı: `username: "admin"`, `password: "admin123"`, `is_admin: true`

---

## ÇALIŞTIRMA

```bash
npm install
node server.js
# → http://localhost:3000
```
