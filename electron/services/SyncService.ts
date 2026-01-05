import Database from 'better-sqlite3';
import { SyncOutbox, SyncState } from '../../src/shared/types';
import os from 'os';

export class SyncService {
  private db: Database.Database;
  private terminalId: number | null = null;
  private storeId: number = 1; // Default store
  private syncInterval: NodeJS.Timeout | null = null;
  private serverUrl: string = '';

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Initialize terminal and sync state
   */
  async initialize(serverUrl?: string): Promise<void> {
    if (serverUrl) {
      this.serverUrl = serverUrl;
    }

    // Get or create terminal identity
    const hostname = os.hostname();
    const terminalCode = `TERM-${hostname}`;

    let terminal = this.db
      .prepare('SELECT * FROM terminals WHERE terminal_code = ?')
      .get(terminalCode) as any;

    if (!terminal) {
      const result = this.db
        .prepare(
          `INSERT INTO terminals (terminal_code, store_id, device_name, ip_address)
           VALUES (?, ?, ?, ?)`
        )
        .run(terminalCode, this.storeId, hostname, this.getLocalIP());

      this.terminalId = result.lastInsertRowid as number;

      // Initialize sync state
      this.db
        .prepare(
          `INSERT INTO sync_state (terminal_id, last_sync_version)
           VALUES (?, 0)`
        )
        .run(this.terminalId);
    } else {
      this.terminalId = terminal.id;
      this.storeId = terminal.store_id;
    }

    console.log(`Terminal initialized: ${terminalCode} (ID: ${this.terminalId})`);
  }

  /**
   * Start periodic sync (every 30 seconds)
   */
  startPeriodicSync(): void {
    if (this.syncInterval) {
      return;
    }

    this.syncInterval = setInterval(() => {
      this.sync().catch(error => {
        console.error('Sync error:', error);
      });
    }, 30000); // 30 seconds

    // Initial sync
    this.sync().catch(error => {
      console.error('Initial sync error:', error);
    });
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Add change to outbox
   */
  addToOutbox(
    entityType: string,
    entityId: number,
    action: 'create' | 'update' | 'delete',
    data: any
  ): void {
    try {
      this.db
        .prepare(
          `INSERT INTO sync_outbox (entity_type, entity_id, action, data, store_id, terminal_id)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          entityType,
          entityId,
          action,
          JSON.stringify(data),
          this.storeId,
          this.terminalId
        );
    } catch (error) {
      console.error('Add to outbox error:', error);
    }
  }

  /**
   * Perform sync: push local changes, pull remote changes
   */
  async sync(): Promise<void> {
    if (!this.serverUrl) {
      console.log('Sync server not configured, skipping sync');
      return;
    }

    console.log('Starting sync...');

    try {
      // Phase 1: Push local changes
      await this.pushChanges();

      // Phase 2: Pull remote changes
      await this.pullChanges();

      // Update last sync timestamp
      this.db
        .prepare(
          `UPDATE terminals 
           SET last_sync_at = datetime('now')
           WHERE id = ?`
        )
        .run(this.terminalId);

      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  }

  /**
   * Push unsynced changes to server
   */
  private async pushChanges(): Promise<void> {
    const unsyncedItems = this.db
      .prepare(
        `SELECT * FROM sync_outbox 
         WHERE synced = 0 
         ORDER BY created_at ASC 
         LIMIT 100`
      )
      .all() as SyncOutbox[];

    if (unsyncedItems.length === 0) {
      return;
    }

    console.log(`Pushing ${unsyncedItems.length} changes to server...`);

    try {
      const response = await fetch(`${this.serverUrl}/api/sync/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terminal_id: this.terminalId,
          store_id: this.storeId,
          changes: unsyncedItems,
        }),
      });

      if (!response.ok) {
        throw new Error(`Push failed: ${response.statusText}`);
      }

      // Mark as synced
      const ids = unsyncedItems.map(item => item.id);
      const placeholders = ids.map(() => '?').join(',');
      this.db
        .prepare(`UPDATE sync_outbox SET synced = 1 WHERE id IN (${placeholders})`)
        .run(...ids);

      // Update sync state
      this.db
        .prepare(
          `UPDATE sync_state 
           SET last_push_at = datetime('now')
           WHERE terminal_id = ?`
        )
        .run(this.terminalId);
    } catch (error) {
      // Increment sync attempts
      const ids = unsyncedItems.map(item => item.id);
      const placeholders = ids.map(() => '?').join(',');
      this.db
        .prepare(
          `UPDATE sync_outbox 
           SET sync_attempts = sync_attempts + 1, 
               last_sync_attempt = datetime('now')
           WHERE id IN (${placeholders})`
        )
        .run(...ids);

      throw error;
    }
  }

  /**
   * Pull changes from server
   */
  private async pullChanges(): Promise<void> {
    const syncState = this.db
      .prepare('SELECT * FROM sync_state WHERE terminal_id = ?')
      .get(this.terminalId) as SyncState;

    try {
      const response = await fetch(
        `${this.serverUrl}/api/sync/pull?terminal_id=${this.terminalId}&since_version=${syncState.last_sync_version}`
      );

      if (!response.ok) {
        throw new Error(`Pull failed: ${response.statusText}`);
      }

      const result = await response.json() as { changes?: any[]; latest_version?: number };
      const changes = result.changes || [];
      const latest_version = result.latest_version || syncState.last_sync_version;

      if (changes && changes.length > 0) {
        console.log(`Applying ${changes.length} remote changes...`);
        this.applyRemoteChanges(changes);
      }

      // Update sync state
      this.db
        .prepare(
          `UPDATE sync_state 
           SET last_pull_at = datetime('now'),
               last_sync_version = ?
           WHERE terminal_id = ?`
        )
        .run(latest_version, this.terminalId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Apply remote changes to local database
   */
  private applyRemoteChanges(changes: any[]): void {
    const transaction = this.db.transaction(() => {
      for (const change of changes) {
        try {
          switch (change.entity_type) {
            case 'product':
              this.applyProductChange(change);
              break;
            case 'category':
              this.applyCategoryChange(change);
              break;
            case 'user':
              this.applyUserChange(change);
              break;
            // Add more entity types as needed
          }
        } catch (error) {
          console.error(`Failed to apply change ${change.id}:`, error);
        }
      }
    });

    transaction();
  }

  /**
   * Apply product change
   */
  private applyProductChange(change: any): void {
    const data = JSON.parse(change.data);

    switch (change.action) {
      case 'create':
      case 'update':
        this.db
          .prepare(
            `INSERT OR REPLACE INTO products 
             (id, name, sku, barcode, category_id, price, cost, stock_quantity, 
              min_stock_level, description, image_url, is_active, store_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            data.id,
            data.name,
            data.sku,
            data.barcode,
            data.category_id,
            data.price,
            data.cost,
            data.stock_quantity,
            data.min_stock_level,
            data.description,
            data.image_url,
            data.is_active,
            data.store_id
          );
        break;

      case 'delete':
        this.db.prepare('DELETE FROM products WHERE id = ?').run(data.id);
        break;
    }
  }

  /**
   * Apply category change
   */
  private applyCategoryChange(change: any): void {
    const data = JSON.parse(change.data);

    switch (change.action) {
      case 'create':
      case 'update':
        this.db
          .prepare(
            `INSERT OR REPLACE INTO categories 
             (id, name, description, store_id)
             VALUES (?, ?, ?, ?)`
          )
          .run(data.id, data.name, data.description, data.store_id);
        break;

      case 'delete':
        this.db.prepare('DELETE FROM categories WHERE id = ?').run(data.id);
        break;
    }
  }

  /**
   * Apply user change
   */
  private applyUserChange(change: any): void {
    const data = JSON.parse(change.data);

    switch (change.action) {
      case 'create':
      case 'update':
        this.db
          .prepare(
            `INSERT OR REPLACE INTO users 
             (id, username, password_hash, full_name, role, is_active, store_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            data.id,
            data.username,
            data.password_hash,
            data.full_name,
            data.role,
            data.is_active,
            data.store_id
          );
        break;

      case 'delete':
        this.db.prepare('DELETE FROM users WHERE id = ?').run(data.id);
        break;
    }
  }

  /**
   * Get local IP address
   */
  private getLocalIP(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }

  /**
   * Get terminal info
   */
  getTerminalInfo() {
    return {
      terminalId: this.terminalId,
      storeId: this.storeId,
    };
  }
}
