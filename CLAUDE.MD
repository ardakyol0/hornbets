Build a full-stack web application called **hornBETS** — a private betting platform for 20 friends running a FIFA World Cup 2026 tournament among themselves. Each friend picks a national team and bets on who will win the private tournament.

---

## TECH STACK

- **Backend:** Node.js + Express (REST API)
- **Database:** SQLite (via `better-sqlite3`) — single file, no setup needed
- **Frontend:** Vanilla HTML/CSS/JS (served statically by Express) — no framework needed
- **Auth:** Session-based auth using `express-session` + bcrypt password hashing
- **No external services required**

---

## PROJECT STRUCTURE
hornbets/
├── server.js              # Express app entry point
├── db.js                  # SQLite setup + seed data
├── routes/
│   ├── auth.js            # login, logout, register
│   ├── teams.js           # list teams, select team
│   ├── bets.js            # place bet, list bets, my bets
│   └── admin.js           # admin panel routes
├── public/
│   ├── index.html         # Login / landing page
│   ├── dashboard.html     # User dashboard
│   ├── teams.html         # Team selection page
│   ├── bet.html           # Place a bet page
│   ├── leaderboard.html   # Live leaderboard
│   ├── admin.html         # Admin panel
│   ├── style.css          # Global styles
│   └── app.js             # Frontend JS (fetch calls)
├── package.json
└── README.md

---

## DATABASE SCHEMA

### users
- id, username, password_hash, display_name, balance (default 1000 coins), selected_team_id (nullable), is_admin (0/1), created_at

### teams
- id, name, flag_emoji, odds_american (e.g. +450), odds_decimal (e.g. 5.5), win_probability_pct (e.g. 18.2), tier (1=favorite, 2=contender, 3=dark horse, 4=longshot), is_available (1 if no user has picked it)

### bets
- id, user_id, team_id, amount, potential_payout, status (pending/won/lost), placed_at

### tournament
- id=1, status (draft/active/finished), winner_team_id (nullable)

---

## SEED DATA — Pre-populate all 48 World Cup 2026 teams with real odds from BetMGM:

```js
const teams = [
  // Tier 1 — Favorites
  { name: "France", flag: "🇫🇷", odds_american: "+450", odds_decimal: 5.5, prob: 15.4, tier: 1 },
  { name: "Spain", flag: "🇪🇸", odds_american: "+500", odds_decimal: 6.0, prob: 14.3, tier: 1 },
  { name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", odds_american: "+650", odds_decimal: 7.5, prob: 11.8, tier: 1 },
  { name: "Brazil", flag: "🇧🇷", odds_american: "+800", odds_decimal: 9.0, prob: 10.0, tier: 1 },
  { name: "Argentina", flag: "🇦🇷", odds_american: "+800", odds_decimal: 9.0, prob: 10.0, tier: 1 },
  // Tier 2 — Contenders
  { name: "Portugal", flag: "🇵🇹", odds_american: "+1000", odds_decimal: 11.0, prob: 8.3, tier: 2 },
  { name: "Germany", flag: "🇩🇪", odds_american: "+1400", odds_decimal: 15.0, prob: 6.3, tier: 2 },
  { name: "Netherlands", flag: "🇳🇱", odds_american: "+2000", odds_decimal: 21.0, prob: 4.5, tier: 2 },
  { name: "Norway", flag: "🇳🇴", odds_american: "+2500", odds_decimal: 26.0, prob: 3.7, tier: 2 },
  { name: "Belgium", flag: "🇧🇪", odds_american: "+3300", odds_decimal: 34.0, prob: 2.9, tier: 2 },
  // Tier 3 — Dark Horses
  { name: "Colombia", flag: "🇨🇴", odds_american: "+4000", odds_decimal: 41.0, prob: 2.4, tier: 3 },
  { name: "Morocco", flag: "🇲🇦", odds_american: "+4000", odds_decimal: 41.0, prob: 2.4, tier: 3 },
  { name: "USA", flag: "🇺🇸", odds_american: "+4000", odds_decimal: 41.0, prob: 2.4, tier: 3 },
  { name: "Japan", flag: "🇯🇵", odds_american: "+5000", odds_decimal: 51.0, prob: 1.9, tier: 3 },
  { name: "Uruguay", flag: "🇺🇾", odds_american: "+5000", odds_decimal: 51.0, prob: 1.9, tier: 3 },
  { name: "Croatia", flag: "🇭🇷", odds_american: "+6600", odds_decimal: 67.0, prob: 1.5, tier: 3 },
  { name: "Ecuador", flag: "🇪🇨", odds_american: "+6600", odds_decimal: 67.0, prob: 1.5, tier: 3 },
  { name: "Mexico", flag: "🇲🇽", odds_american: "+6600", odds_decimal: 67.0, prob: 1.5, tier: 3 },
  { name: "Senegal", flag: "🇸🇳", odds_american: "+6600", odds_decimal: 67.0, prob: 1.5, tier: 3 },
  { name: "Sweden", flag: "🇸🇪", odds_american: "+6600", odds_decimal: 67.0, prob: 1.5, tier: 3 },
  { name: "Switzerland", flag: "🇨🇭", odds_american: "+6600", odds_decimal: 67.0, prob: 1.5, tier: 3 },
  { name: "Turkey", flag: "🇹🇷", odds_american: "+6600", odds_decimal: 67.0, prob: 1.5, tier: 3 },
  { name: "Austria", flag: "🇦🇹", odds_american: "+10000", odds_decimal: 101.0, prob: 1.0, tier: 3 },
  // Tier 4 — Longshots
  { name: "Canada", flag: "🇨🇦", odds_american: "+15000", odds_decimal: 151.0, prob: 0.7, tier: 4 },
  { name: "Paraguay", flag: "🇵🇾", odds_american: "+15000", odds_decimal: 151.0, prob: 0.7, tier: 4 },
  { name: "Czech Republic", flag: "🇨🇿", odds_american: "+20000", odds_decimal: 201.0, prob: 0.5, tier: 4 },
  { name: "Ivory Coast", flag: "🇨🇮", odds_american: "+20000", odds_decimal: 201.0, prob: 0.5, tier: 4 },
  { name: "Algeria", flag: "🇩🇿", odds_american: "+25000", odds_decimal: 251.0, prob: 0.4, tier: 4 },
  { name: "Bosnia & Herzegovina", flag: "🇧🇦", odds_american: "+25000", odds_decimal: 251.0, prob: 0.4, tier: 4 },
  { name: "Egypt", flag: "🇪🇬", odds_american: "+25000", odds_decimal: 251.0, prob: 0.4, tier: 4 },
  { name: "Ghana", flag: "🇬🇭", odds_american: "+25000", odds_decimal: 251.0, prob: 0.4, tier: 4 },
  { name: "Iran", flag: "🇮🇷", odds_american: "+25000", odds_decimal: 251.0, prob: 0.4, tier: 4 },
  { name: "Nigeria", flag: "🇳🇬", odds_american: "+25000", odds_decimal: 251.0, prob: 0.4, tier: 4 },
  { name: "Poland", flag: "🇵🇱", odds_american: "+25000", odds_decimal: 251.0, prob: 0.4, tier: 4 },
  { name: "Qatar", flag: "🇶🇦", odds_american: "+30000", odds_decimal: 301.0, prob: 0.3, tier: 4 },
  { name: "Saudi Arabia", flag: "🇸🇦", odds_american: "+30000", odds_decimal: 301.0, prob: 0.3, tier: 4 },
  { name: "South Korea", flag: "🇰🇷", odds_american: "+30000", odds_decimal: 301.0, prob: 0.3, tier: 4 },
  { name: "Australia", flag: "🇦🇺", odds_american: "+30000", odds_decimal: 301.0, prob: 0.3, tier: 4 },
  { name: "Cameroon", flag: "🇨🇲", odds_american: "+35000", odds_decimal: 351.0, prob: 0.3, tier: 4 },
  { name: "Chile", flag: "🇨🇱", odds_american: "+35000", odds_decimal: 351.0, prob: 0.3, tier: 4 },
  { name: "Costa Rica", flag: "🇨🇷", odds_american: "+35000", odds_decimal: 351.0, prob: 0.3, tier: 4 },
  { name: "Denmark", flag: "🇩🇰", odds_american: "+35000", odds_decimal: 351.0, prob: 0.3, tier: 4 },
  { name: "Greece", flag: "🇬🇷", odds_american: "+40000", odds_decimal: 401.0, prob: 0.2, tier: 4 },
  { name: "Honduras", flag: "🇭🇳", odds_american: "+50000", odds_decimal: 501.0, prob: 0.2, tier: 4 },
  { name: "New Zealand", flag: "🇳🇿", odds_american: "+50000", odds_decimal: 501.0, prob: 0.2, tier: 4 },
  { name: "Romania", flag: "🇷🇴", odds_american: "+50000", odds_decimal: 501.0, prob: 0.2, tier: 4 },
  { name: "Ukraine", flag: "🇺🇦", odds_american: "+50000", odds_decimal: 501.0, prob: 0.2, tier: 4 },
  { name: "Venezuela", flag: "🇻🇪", odds_american: "+60000", odds_decimal: 601.0, prob: 0.2, tier: 4 },
];
```

Also seed one admin user: `username: "admin"`, `password: "admin123"`, `is_admin: 1`

---

## CORE FEATURES

### 1. Authentication
- Login page (default landing)
- Register new account (admin can also create accounts manually)
- Session persistence
- Logout

### 2. Team Selection (one-time, per user)
- Each of the 48 teams can be claimed by only one player
- Once you pick a team it's locked to your account
- Show teams grouped by tier with their flag, name, odds, and win probability %
- Mark unavailable teams (already claimed) as greyed out

### 3. Betting System
- Each user starts with **1000 coins**
- Users can bet any amount on any team to win the tournament (not just their own team)
- Bets use **decimal odds** to calculate potential payout: `payout = amount × odds_decimal`
- Users can place **multiple bets** on different teams
- Show potential payout preview before confirming
- Bets are locked once tournament status = "active"

### 4. Dashboard
- Show: username, balance, selected team, total bets placed, total potential payout
- List all the user's placed bets with status badges

### 5. Leaderboard
- Rank all 20 users by: selected team's win probability, total coins bet, total potential payout
- Show each user's team flag + name, odds, and whether team is still in tournament

### 6. Admin Panel (is_admin = 1 only)
- View all users + their selected teams + balance
- Set tournament status: draft → active → finished
- When setting "finished": select the winning team → all bets on that team flip to "won", others to "lost", winning users receive their payout added to balance
- Manually reset/override a user's team selection if needed

---

## DESIGN SYSTEM — Professional, minimal, dark-accented

**Color Palette:**
- Background: `#0a0a0a` (near black)
- Surface / Card: `#141414`
- Border: `#2a2a2a`
- Primary accent: `#F5C518` (FIFA gold/yellow)
- Primary hover: `#e6b800`
- Text primary: `#ffffff`
- Text secondary: `#888888`
- Success green: `#22c55e`
- Danger red: `#ef4444`
- Warning: `#f59e0b`

**Typography:**
- Font: `'Inter', sans-serif` (import from Google Fonts)
- Headings: bold, tracked slightly
- Logo: `horn**BETS**` — "horn" in white, "BETS" in `#F5C518`

**UI Components:**
- Cards with subtle border + slight box-shadow
- Buttons: filled yellow `#F5C518` with black text, rounded-md, hover darkens
- Secondary buttons: outlined white border
- Input fields: dark background, yellow focus ring
- Tier badges: colored chips (Gold/Silver/Bronze/Gray per tier)
- Navigation: top navbar with logo left, links center, user info + logout right
- Responsive: mobile-friendly with a hamburger menu

**Pages layout:**
- `index.html`: centered card with logo, login form, link to register — full page dark background
- `dashboard.html`: stats grid at top (4 cards), then bet history table
- `teams.html`: filter bar (all/tier), grid of team cards (3-4 cols), each card flips or expands on click to show "Select this team" button
- `bet.html`: team search/filter, odds table, click a team opens a bet slip sidebar/modal with amount input and payout preview
- `leaderboard.html`: full-width ranked table with avatars (initials), team flag, odds, potential winnings
- `admin.html`: tabbed layout — Users tab, Tournament control tab

---

## API ROUTES
POST /api/auth/login         { username, password }
POST /api/auth/register      { username, password, display_name }
POST /api/auth/logout
GET  /api/auth/me
GET  /api/teams              returns all teams with is_available flag
POST /api/teams/select       { team_id } — lock team for current user
GET  /api/bets               current user's bets
POST /api/bets               { team_id, amount } — place bet
GET  /api/bets/all           admin only — all bets
GET  /api/leaderboard        public ranking
GET  /api/admin/users        admin only
POST /api/admin/tournament   { status, winner_team_id? }
POST /api/admin/reset-team   { user_id } — admin override

---

## IMPORTANT NOTES

- All API responses should be JSON `{ success: true, data: ... }` or `{ success: false, error: "..." }`
- Use `express-session` with a hardcoded secret `"hornbets-secret-2026"`
- Protect all routes except login/register — return 401 if not authenticated
- Frontend uses `fetch()` with `credentials: 'include'`
- No TypeScript — plain JS throughout
- Include a `README.md` with: `npm install` → `node server.js` → open `http://localhost:3000`
- Make sure `db.js` calls an `initDB()` function that creates tables + seeds if they don't exist, called at server startup
- Tournament starts in "draft" status; betting is allowed in draft, locked in active/finished

Build the complete project, all files, ready to run with `npm install && node server.js`.