import { Database } from 'better-sqlite3';

/**
 * Phase 3: Enterprise Schema
 * - Multi-store support
 * - Audit logs
 * - Sync infrastructure
 * - Terminal management
 */
export function up(db: Database): void {
  // Stores table (multi-branch support)
  db.exec(`
    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      email TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Insert default store
  db.exec(`
    INSERT INTO stores (store_code, name, is_active)
    VALUES ('MAIN', 'Main Store', 1)
  `);

  // Terminals table (track devices)
  db.exec(`
    CREATE TABLE IF NOT EXISTS terminals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      terminal_code TEXT UNIQUE NOT NULL,
      store_id INTEGER NOT NULL,
      device_name TEXT NOT NULL,
      ip_address TEXT,
      last_sync_at TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (store_id) REFERENCES stores(id)
    )
  `);

  // Audit logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      store_id INTEGER NOT NULL,
      terminal_id INTEGER,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('create', 'update', 'delete', 'login', 'logout')),
      old_values TEXT,
      new_values TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (store_id) REFERENCES stores(id),
      FOREIGN KEY (terminal_id) REFERENCES terminals(id)
    )
  `);

  // Sync outbox (changes waiting to sync)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('create', 'update', 'delete')),
      data TEXT NOT NULL,
      store_id INTEGER NOT NULL,
      terminal_id INTEGER,
      synced INTEGER DEFAULT 0,
      sync_attempts INTEGER DEFAULT 0,
      last_sync_attempt TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (store_id) REFERENCES stores(id),
      FOREIGN KEY (terminal_id) REFERENCES terminals(id)
    )
  `);

  // Sync state (track last sync cursor)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      terminal_id INTEGER NOT NULL,
      last_pull_at TEXT,
      last_push_at TEXT,
      last_sync_version INTEGER DEFAULT 0,
      FOREIGN KEY (terminal_id) REFERENCES terminals(id)
    )
  `);

  // Add store_id to existing tables
  db.exec(`
    ALTER TABLE users ADD COLUMN store_id INTEGER REFERENCES stores(id);
    ALTER TABLE products ADD COLUMN store_id INTEGER REFERENCES stores(id);
    ALTER TABLE sales ADD COLUMN store_id INTEGER REFERENCES stores(id);
    ALTER TABLE categories ADD COLUMN store_id INTEGER REFERENCES stores(id);
  `);

  // Update existing records to reference default store
  const defaultStoreId = db.prepare('SELECT id FROM stores WHERE store_code = ?').get('MAIN') as { id: number };
  db.exec(`
    UPDATE users SET store_id = ${defaultStoreId.id} WHERE store_id IS NULL;
    UPDATE products SET store_id = ${defaultStoreId.id} WHERE store_id IS NULL;
    UPDATE sales SET store_id = ${defaultStoreId.id} WHERE store_id IS NULL;
    UPDATE categories SET store_id = ${defaultStoreId.id} WHERE store_id IS NULL;
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_sync_outbox_synced ON sync_outbox(synced);
    CREATE INDEX IF NOT EXISTS idx_sync_outbox_terminal ON sync_outbox(terminal_id);
    CREATE INDEX IF NOT EXISTS idx_users_store ON users(store_id);
    CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
    CREATE INDEX IF NOT EXISTS idx_sales_store ON sales(store_id);
  `);

  console.log('Phase 3 schema created successfully');
}

export function down(db: Database): void {
  db.exec(`
    DROP TABLE IF EXISTS sync_state;
    DROP TABLE IF EXISTS sync_outbox;
    DROP TABLE IF EXISTS audit_logs;
    DROP TABLE IF EXISTS terminals;
    DROP TABLE IF EXISTS stores;
  `);

  // Note: Cannot remove columns in SQLite without recreating tables
  console.log('Phase 3 schema removed (store_id columns remain)');
}
