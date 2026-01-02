import Database from 'better-sqlite3';
import { AuditLog } from '../../src/shared/types';

export class AuditService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Log an audit event
   */
  log(
    userId: number,
    storeId: number,
    entityType: string,
    entityId: number,
    action: 'create' | 'update' | 'delete' | 'login' | 'logout',
    oldValues?: any,
    newValues?: any,
    terminalId?: number
  ): void {
    try {
      this.db
        .prepare(
          `INSERT INTO audit_logs 
           (user_id, store_id, terminal_id, entity_type, entity_id, action, old_values, new_values)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          userId,
          storeId,
          terminalId || null,
          entityType,
          entityId,
          action,
          oldValues ? JSON.stringify(oldValues) : null,
          newValues ? JSON.stringify(newValues) : null
        );
    } catch (error) {
      console.error('Audit log error:', error);
    }
  }

  /**
   * Get audit logs with filters
   */
  getLogs(filters?: {
    userId?: number;
    entityType?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): AuditLog[] {
    let query = `
      SELECT a.*, u.username, u.full_name 
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filters?.userId) {
      query += ' AND a.user_id = ?';
      params.push(filters.userId);
    }

    if (filters?.entityType) {
      query += ' AND a.entity_type = ?';
      params.push(filters.entityType);
    }

    if (filters?.action) {
      query += ' AND a.action = ?';
      params.push(filters.action);
    }

    if (filters?.startDate) {
      query += ' AND a.created_at >= ?';
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      query += ' AND a.created_at <= ?';
      params.push(filters.endDate);
    }

    query += ' ORDER BY a.created_at DESC LIMIT ?';
    params.push(filters?.limit || 100);

    return this.db.prepare(query).all(...params) as AuditLog[];
  }

  /**
   * Get audit log for specific entity
   */
  getEntityHistory(entityType: string, entityId: number): AuditLog[] {
    return this.db
      .prepare(
        `SELECT a.*, u.username, u.full_name 
         FROM audit_logs a
         LEFT JOIN users u ON a.user_id = u.id
         WHERE a.entity_type = ? AND a.entity_id = ?
         ORDER BY a.created_at DESC`
      )
      .all(entityType, entityId) as AuditLog[];
  }
}
