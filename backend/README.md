# Digi Sacco Backend

This backend is a simple Node.js server for the Digi Sacco application.
It uses MySQL for data storage.

## Setup

1. Copy `.env.example` to `.env`.
2. Update the MySQL connection values.
3. Install dependencies:

```bash
cd backend
npm install
```

4. Start the server:

```bash
npm start
```

The server runs on `http://localhost:5000` by default.

## Available API routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/categories`
- `GET /api/group-managers`
- `GET /api/dashboard/summary`

## Notes

- The server creates the `digisacco` database and initial tables if needed.
- Passwords are stored in a simple base64 format only for example purposes.
  For production, replace this with a secure hashing method.
