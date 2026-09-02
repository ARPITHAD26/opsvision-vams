# OpsVision VAMS

A runnable full-stack Visitor Access Management System starter based on the supplied product vision.

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: SQLite via better-sqlite3
- Authentication: JWT + role-based access
- QR: qrcode
- OTP: demo OTP mode (logs to server console)

## Run
1. `cd backend && npm install && npm run dev`
2. In another terminal: `cd frontend && npm install && npm run dev`
3. Open the URL shown by Vite (normally http://localhost:5173)

Demo users:
- admin / admin123
- guard / guard123
- reception / reception123
- employee / employee123

Demo OTP: when registration creates an OTP, it is printed in the backend terminal. For convenience, OTP `123456` is also accepted in development mode.

This is a production-ready architecture starter, not a claim that SMS/email/CCTV/face-recognition integrations are already connected. Those require provider credentials and device/service integrations.
