import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import Database from 'better-sqlite3';
import { initDatabase } from './database/config';
import { runMigrations } from './database/migrator';
import { AuthService } from './services/AuthService';
import { ProductService } from './services/ProductService';
import { SalesService } from './services/SalesService';
import { AuditService } from './services/AuditService';
import { SyncService } from './services/SyncService';

let mainWindow: BrowserWindow | null = null;
let db: Database.Database;
let authService: AuthService;
let productService: ProductService;
let salesService: SalesService;
let auditService: AuditService;
let syncService: SyncService;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'POS System',
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function initializeDatabase() {
  db = initDatabase();

  // Run migrations
  runMigrations(db);

  // Initialize services
  authService = new AuthService(db);
  productService = new ProductService(db);
  salesService = new SalesService(db);
  auditService = new AuditService(db);
  syncService = new SyncService(db);

  // Initialize sync (optional - set server URL if available)
  const syncServerUrl = process.env.SYNC_SERVER_URL || '';
  if (syncServerUrl) {
    syncService.initialize(syncServerUrl).then(() => {
      syncService.startPeriodicSync();
      console.log('Sync service initialized and started');
    });
  } else {
    syncService.initialize().then(() => {
      console.log('Sync service initialized (offline mode)');
    });
  }

  console.log('Database initialized successfully');
}

function setupIpcHandlers() {
  // Auth handlers
  ipcMain.handle('auth:login', async (_, credentials) => {
    return await authService.login(credentials);
  });

  ipcMain.handle('auth:create-user', async (_, username, password, fullName, role) => {
    return await authService.createUser(username, password, fullName, role);
  });

  ipcMain.handle('auth:update-password', async (_, userId, oldPassword, newPassword) => {
    return await authService.updatePassword(userId, oldPassword, newPassword);
  });

  ipcMain.handle('auth:get-all-users', () => {
    return authService.getAllUsers();
  });

  ipcMain.handle('auth:toggle-user-status', (_, userId) => {
    return authService.toggleUserStatus(userId);
  });

  // Category handlers
  ipcMain.handle('products:get-all-categories', () => {
    return productService.getAllCategories();
  });

  ipcMain.handle('products:create-category', (_, name, description) => {
    return productService.createCategory(name, description);
  });

  ipcMain.handle('products:update-category', (_, id, name, description) => {
    return productService.updateCategory(id, name, description);
  });

  ipcMain.handle('products:delete-category', (_, id) => {
    return productService.deleteCategory(id);
  });

  // Product handlers
  ipcMain.handle('products:get-all', () => {
    return productService.getAllProducts();
  });

  ipcMain.handle('products:get-by-id', (_, id) => {
    return productService.getProductById(id);
  });

  ipcMain.handle('products:search', (_, query) => {
    return productService.searchProducts(query);
  });

  ipcMain.handle('products:create', (_, product) => {
    return productService.createProduct(product);
  });

  ipcMain.handle('products:update', (_, id, product) => {
    return productService.updateProduct(id, product);
  });

  ipcMain.handle('products:delete', (_, id) => {
    return productService.deleteProduct(id);
  });

  ipcMain.handle('products:update-stock', (_, id, quantity) => {
    return productService.updateStock(id, quantity);
  });

  ipcMain.handle('products:get-low-stock', () => {
    return productService.getLowStockProducts();
  });

  // Sales handlers
  ipcMain.handle('sales:create', (_, userId, items, paymentMethod, discount, tax, notes) => {
    return salesService.createSale(userId, items, paymentMethod, discount, tax, notes);
  });

  ipcMain.handle('sales:get-by-id', (_, id) => {
    return salesService.getSaleById(id);
  });

  ipcMain.handle('sales:get-all', (_, limit, offset) => {
    return salesService.getAllSales(limit, offset);
  });

  ipcMain.handle('sales:get-by-date-range', (_, startDate, endDate) => {
    return salesService.getSalesByDateRange(startDate, endDate);
  });

  ipcMain.handle('sales:get-todays', () => {
    return salesService.getTodaysSales();
  });

  ipcMain.handle('sales:get-stats', (_, startDate, endDate) => {
    return salesService.getSalesStats(startDate, endDate);
  });

  ipcMain.handle('sales:get-top-selling', (_, limit) => {
    return salesService.getTopSellingProducts(limit);
  });

  ipcMain.handle('sales:refund', (_, saleId) => {
    return salesService.refundSale(saleId);
  });

  // Audit handlers
  ipcMain.handle('audit:get-logs', (_, filters) => {
    return auditService.getLogs(filters);
  });

  ipcMain.handle('audit:get-entity-history', (_, entityType, entityId) => {
    return auditService.getEntityHistory(entityType, entityId);
  });

  // Sync handlers
  ipcMain.handle('sync:manual-sync', async () => {
    await syncService.sync();
    return { success: true };
  });

  ipcMain.handle('sync:get-terminal-info', () => {
    return syncService.getTerminalInfo();
  });

  ipcMain.handle('sync:configure-server', async (_, serverUrl) => {
    await syncService.initialize(serverUrl);
    syncService.startPeriodicSync();
    return { success: true };
  });
}

app.whenReady().then(() => {
  initializeDatabase();
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (syncService) {
      syncService.stopPeriodicSync();
    }
    if (db) {
      db.close();
    }
    app.quit();
  }
});

app.on('before-quit', () => {
  if (syncService) {
    syncService.stopPeriodicSync();
  }
  if (db) {
    db.close();
  }
});
