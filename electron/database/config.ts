/**
 * Database Configuration
 * 
 * This module handles the SQLite database connection and initialization.
 * It uses better-sqlite3 for synchronous database operations which is
 * more suitable for Electron applications than asynchronous drivers.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

/**
 * Database instance (singleton)
 */
let db: Database.Database | null = null;

/**
 * Get the database file path
 * In development: stores in project root
 * In production: stores in user data directory
 */
export function getDatabasePath(): string {
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    return path.join(process.cwd(), 'pos-database.db');
  }
  
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'pos-database.db');
}

/**
 * Initialize and return database connection
 * Creates database file if it doesn't exist
 * 
 * @returns Database instance
 */
export function initDatabase(): Database.Database {
  if (db) {
    return db;
  }

  const dbPath = getDatabasePath();
  
  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log(`Initializing database at: ${dbPath}`);

  // Create database connection
  db = new Database(dbPath, {
    verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
  });

  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Set journal mode to WAL for better concurrency
  db.pragma('journal_mode = WAL');

  return db;
}

/**
 * Get the database instance
 * Throws error if database is not initialized
 * 
 * @returns Database instance
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('Database connection closed');
  }
}

/**
 * Execute a database transaction
 * Automatically rolls back on error
 * 
 * @param fn - Function to execute within transaction
 * @returns Result of the transaction function
 */
export function transaction<T>(fn: (db: Database.Database) => T): T {
  const database = getDatabase();
  const trans = database.transaction(fn);
  return trans(database);
}
