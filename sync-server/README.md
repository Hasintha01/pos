# POS Sync Server

Central sync server for multi-terminal POS system.

## Features

- **REST API** for push/pull sync
- **SQLite database** for change log storage
- **Dashboard API** for monitoring
- **Version-based sync** (conflict-free)

## Setup

```bash
cd sync-server
npm install
```

## Development

```bash
npm run dev
```

Server runs on `http://localhost:3001`

## Production

```bash
npm run build
npm start
```

## API Endpoints

### Sync Endpoints

- `POST /api/sync/push` - Push changes from terminal
- `GET /api/sync/pull?terminal_id=X&since_version=Y` - Pull changes for terminal

### Dashboard Endpoints

- `GET /api/dashboard/stats` - Get sync statistics
- `GET /api/dashboard/activity` - Get recent sync activity

### Health

- `GET /health` - Health check

## Environment Variables

Create `.env` file:

```env
PORT=3001
```

## Database

- Location: `sync-server/sync-server.db`
- Tables:
  - `sync_changes` - Change log
  - `sync_metadata` - Version tracking

## Configure Terminals

In each POS terminal, set sync server URL:

```typescript
// In electron/main.ts
syncService.initialize('http://SERVER_IP:3001');
syncService.startPeriodicSync();
```

Replace `SERVER_IP` with your LAN server IP (e.g., `192.168.1.100`)
