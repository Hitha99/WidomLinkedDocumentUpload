# Wisdom Document System

**Wisdom Document System** – upload **SOP**, **LOR**, **Resume**, and **Transcript**, plus an optional message to the admission committee. Simple login/register and file storage in a local database.

UI follows the same color theme as [WisdomLinked](https://github.com/WisdomLinked/WisdomLinked): dark background with teal/cyan accents (`#31b099`, `#3bdbbe`, `#76d1f7`).

## Features

- **Student & committee login** – Students register and upload; committee members log in to view all submissions
- **Student uploads** – SOP, LOR, Resume, Transcript (PDF, DOC, DOCX, TXT, max 10MB each)
- **Message to committee** – Text area for students to send a message to the admission committee
- **Committee dashboard** – View all students and each student’s documents and message; download files
- **Database storage** – SQLite for users (with role), document metadata, and messages; files stored on disk
- **WisdomLinked theme** – Dark UI with teal/cyan gradient accents

## Tech Stack

- **Frontend:** React 18, Vite, React Router
- **Backend:** Node.js, Express
- **Database:** SQLite (via `better-sqlite3`) – no external DB required

## Prerequisites

- Node.js 18+
- npm

## Setup

1. **Clone and install**

   ```bash
   git clone <your-repo-url>
   cd WindomDocumentUpload
   npm run install:all
   ```

2. **Run development**

   - Terminal 1 – backend:
     ```bash
     npm run server
     ```
   - Terminal 2 – frontend:
     ```bash
     npm run client
     ```

   Or from the repo root (with `concurrently`):

   ```bash
   npm run dev
   ```

3. **Open**

   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend API: [http://localhost:4001](http://localhost:4001)

## Deploying to GitHub

1. **Create a new repository** on GitHub (e.g. `WindomDocumentUpload`).

2. **Push this project:**

   ```bash
   git init
   git add .
   git commit -m "Initial commit: Wisdom Document System"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/WindomDocumentUpload.git
   git push -u origin main
   ```

3. **Optional – deploy the app:**

   - **Frontend (static):** Build and deploy the client to **GitHub Pages** or any static host:
     ```bash
     npm run build
     ```
     Upload the contents of `client/dist/` to GitHub Pages (or use a GitHub Action).

   - **Backend:** Run the server on a Node host (e.g. Railway, Render, Fly.io). Set `PORT` as required. The SQLite DB and `server/uploads/` will persist only on that host unless you add external storage.

   - For a **full-stack** deployment, host the backend somewhere that runs Node, then set the frontend’s API base URL (e.g. via env) to that backend when building.

## GitHub Actions + Pages deployment

1. Deploy the **backend** (Railway, Render, etc.) and copy its URL.
2. Repo **Settings → Secrets and variables → Actions** → add **variable** `BACKEND_URL` = your backend URL.
3. Repo **Settings → Pages** → Source: **GitHub Actions**.
4. Push to `main`; the workflow deploys the frontend. Site: `https://<username>.github.io/<repo-name>/`

## Environment (optional)

- **Backend** (`server/`): `PORT` (default `4001`)
- **Frontend** (`client/`): use Vite’s `VITE_API_URL` if you need to point to a different API in production

**Committee accounts:** Students register via “Register as student”. Committee members can register via "Register as committee" on the login page, same flow as students.

## API Overview

- `POST /api/auth/register` – Register (email, password)
- `POST /api/auth/login` – Login (email, password)
- `GET /api/documents` – List documents and latest message (requires `Authorization: Bearer <token>`)
- `POST /api/documents/upload` – Upload file (type: sop | lor | resume | transcript)
- `POST /api/documents/message` – Save message to committee
- `DELETE /api/documents/:id` – Delete a document

## License

MIT
