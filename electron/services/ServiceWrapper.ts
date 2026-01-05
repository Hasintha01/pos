import { AuditService } from './AuditService';
import { SyncService } from './SyncService';

/**
 * Service wrapper that adds audit logging and sync queueing
 */
export class ServiceWrapper {
  constructor(
    private auditService: AuditService,
    private syncService: SyncService
  ) {}

  /**
   * Wrap a service method to add audit + sync
   */
  wrapMethod<T extends (...args: any[]) => any>(
    entityType: string,
    action: 'create' | 'update' | 'delete',
    method: T,
    options: {
      getUserId?: (...args: Parameters<T>) => number;
      getEntityId?: (...args: Parameters<T>) => number;
      getResult?: (result: ReturnType<T>) => any;
    } = {}
  ): T {
    return ((...args: Parameters<T>) => {
      const result = method(...args);

      // Only log if operation was successful
      if (result && (result.success !== false)) {
        try {
          const userId = options.getUserId?.(...args) || 1; // Default to system user
          const entityId = options.getEntityId?.(...args) || 
                          (result.id || result[entityType]?.id || 0);
          const data = options.getResult?.(result) || result;

          // Log audit
          const terminalInfo = this.syncService.getTerminalInfo();
          this.auditService.log(
            userId,
            terminalInfo.storeId || 1,
            entityType,
            entityId,
            action,
            null,
            data,
            terminalInfo.terminalId || undefined
          );

          // Queue for sync
          this.syncService.addToOutbox(entityType, entityId, action, data);
        } catch (error) {
          console.error('Wrapper error:', error);
        }
      }

      return result;
    }) as T;
  }
}
