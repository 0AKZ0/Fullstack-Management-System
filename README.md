# Fullstack Management System

A compact project/task management application with a REST API, SQLite persistence, and a responsive browser interface.

## Stack
- Node.js 20+
- Express 4
- SQLite via better-sqlite3
- Vanilla JavaScript, HTML and CSS

## Run locally
```bash
npm install
cp .env.example .env
npm run dev
```
Open http://localhost:3000. The SQLite database is created automatically in `data/app.db`.

## API
| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/tasks` | List tasks (optional `?status=todo`) |
| POST | `/api/tasks` | Create a task |
| PATCH | `/api/tasks/:id` | Update title, description or status |
| DELETE | `/api/tasks/:id` | Delete a task |
| GET | `/api/health` | Health check |

Example:
```json
{ "title": "Prepare monthly report", "description": "Consolidate KPI data", "status": "todo" }
```

Allowed statuses: `todo`, `in_progress`, `done`.

## Quality
```bash
npm test
```

## Security notes
The sample is intended for local development and portfolio demonstration. Before production use, add authentication, authorization, CSRF protection where applicable, rate limiting, structured logging, backups, and a deployment-specific secret manager. Do not expose the SQLite file or use this demo as a multi-user production system without those controls.

MIT License.
