# Attendance Portal (Teachers)

Simple teacher portal to mark attendance and notify parents by email.

## Stack
- Node.js + Express
- SQLite (file DB)
- EJS templates
- Nodemailer (SMTP email)

## Setup
1. Install Node.js LTS.
2. In project folder:
   ```bash
   npm install
   npm run db:init
   npm run db:seed
   cp .env.example .env # On Windows: copy .env.example .env
   # Edit .env with SMTP credentials (optional for local test)
   npm run dev
   ```
3. Open http://localhost:3000

Login:
- Email: teacher@example.com
- Password: pass1234

## Notes
- Email notifications are sent only if SMTP env vars are set.
- Data is stored in `data/app.db`. Sessions in `data/sessions.db`.
