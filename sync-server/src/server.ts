import express, { Request, Response } from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static dashboard
app.use(express.static(path.join(__dirname, 'public')));

// Database
const dbPath = path.join(__dirname, '../sync-server.db');
const db = new Database(dbPath);

// Initialize sync server database
db.exec(`
  CREATE TABLE IF NOT EXISTS sync_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL,
    terminal_id INTEGER,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    data TEXT NOT NULL,
    version INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_sync_changes_store ON sync_changes(store_id);
  CREATE INDEX IF NOT EXISTS idx_sync_changes_version ON sync_changes(version);
  CREATE INDEX IF NOT EXISTS idx_sync_changes_created ON sync_changes(created_at);

  CREATE TABLE IF NOT EXISTS sync_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  INSERT OR IGNORE INTO sync_metadata (key, value) VALUES ('latest_version', '0');
`);

console.log(`Sync server database initialized at: ${dbPath}`);

// ============================================================================
// Sync API Routes
// ============================================================================

/**
 * Push changes from terminal
 */
app.post('/api/sync/push', (req: Request, res: Response) => {
  try {
    const { terminal_id, store_id, changes } = req.body;

    if (!terminal_id || !store_id || !changes || !Array.isArray(changes)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    const transaction = db.transaction(() => {
      // Get current version
      const metadata = db.prepare('SELECT value FROM sync_metadata WHERE key = ?').get('latest_version') as { value: string };
      let currentVersion = parseInt(metadata.value);

      const insertStmt = db.prepare(
        `INSERT INTO sync_changes (store_id, terminal_id, entity_type, entity_id, action, data, version)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );

      for (const change of changes) {
        currentVersion++;
        insertStmt.run(
          store_id,
          terminal_id,
          change.entity_type,
          change.entity_id,
          change.action,
          change.data,
          currentVersion
        );
      }

      // Update latest version
      db.prepare('UPDATE sync_metadata SET value = ? WHERE key = ?').run(
        currentVersion.toString(),
        'latest_version'
      );

      return currentVersion;
    });

    const latestVersion = transaction();

    res.json({
      success: true,
      changes_received: changes.length,
      latest_version: latestVersion,
    });
  } catch (error: any) {
    console.error('Push error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Pull changes for terminal
 */
app.get('/api/sync/pull', (req: Request, res: Response) => {
  try {
    const terminalId = parseInt(req.query.terminal_id as string);
    const sinceVersion = parseInt(req.query.since_version as string) || 0;

    if (!terminalId) {
      return res.status(400).json({ error: 'terminal_id required' });
    }

    // Get changes since last sync (excluding own terminal's changes)
    const changes = db
      .prepare(
        `SELECT * FROM sync_changes 
         WHERE version > ? 
         AND (terminal_id IS NULL OR terminal_id != ?)
         ORDER BY version ASC 
         LIMIT 1000`
      )
      .all(sinceVersion, terminalId);

    // Get latest version
    const metadata = db.prepare('SELECT value FROM sync_metadata WHERE key = ?').get('latest_version') as { value: string };
    const latestVersion = parseInt(metadata.value);

    res.json({
      success: true,
      changes,
      latest_version: latestVersion,
      count: changes.length,
    });
  } catch (error: any) {
    console.error('Pull error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Dashboard API Routes
// ============================================================================

/**
 * Get dashboard stats
 */
app.get('/api/dashboard/stats', (req: Request, res: Response) => {
  try {
    const stats = {
      total_syncs: db.prepare('SELECT COUNT(*) as count FROM sync_changes').get() as { count: number },
      latest_version: db.prepare('SELECT value FROM sync_metadata WHERE key = ?').get('latest_version') as { value: string },
      syncs_today: db
        .prepare(`SELECT COUNT(*) as count FROM sync_changes WHERE DATE(created_at) = DATE('now')`)
        .get() as { count: number },
    };

    res.json(stats);
  } catch (error: any) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get recent sync activity
 */
app.get('/api/dashboard/activity', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;

    const activity = db
      .prepare(
        `SELECT * FROM sync_changes 
         ORDER BY created_at DESC 
         LIMIT ?`
      )
      .all(limit);

    res.json(activity);
  } catch (error: any) {
    console.error('Activity error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Health Check
// ============================================================================

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║          POS Sync Server Running                  ║
╠═══════════════════════════════════════════════════╣
║  Port: ${PORT}                                     ║
║  Database: ${dbPath}   
╚═══════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down sync server...');
  db.close();
  process.exit(0);
});
