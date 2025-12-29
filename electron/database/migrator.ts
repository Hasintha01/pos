/**
 * Database Migration System
 */

import Database from 'better-sqlite3';
import { migrations, Migration } from './migrations/index';

interface MigrationRecord {
  id: string;
  name: string;
  executed_at: string;
}

function initMigrationsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      executed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function getExecutedMigrations(db: Database.Database): MigrationRecord[] {
  const stmt = db.prepare('SELECT * FROM migrations ORDER BY id ASC');
  return stmt.all() as MigrationRecord[];
}

function recordMigration(db: Database.Database, id: string, name: string): void {
  const stmt = db.prepare('INSERT INTO migrations (id, name) VALUES (?, ?)');
  stmt.run(id, name);
}

export function runMigrations(db: Database.Database): void {
  console.log('Starting database migrations...');
  
  initMigrationsTable(db);
  
  const executed = getExecutedMigrations(db);
  const executedIds = new Set(executed.map((m: MigrationRecord) => m.id));
  
  const pending = migrations.filter((m: Migration) => !executedIds.has(m.id));
  
  if (pending.length === 0) {
    console.log('No pending migrations.');
    return;
  }
  
  console.log(`Found ${pending.length} pending migration(s).`);
  
  for (const migration of pending) {
    console.log(`Running migration: ${migration.id} - ${migration.name}`);
    
    try {
      migration.up(db);
      recordMigration(db, migration.id, migration.name);
      console.log(`Migration ${migration.id} completed successfully.`);
    } catch (error) {
      console.error(`Migration ${migration.id} failed:`, error);
      throw error;
    }
  }
  
  console.log('All migrations completed successfully.');
}
