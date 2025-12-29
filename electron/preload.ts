import { contextBridge, ipcRenderer } from 'electron';
import { LoginCredentials, User, Product, Category, Sale } from '../src/shared/types';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Auth API
  auth: {
    login: (credentials: LoginCredentials) =>
      ipcRenderer.invoke('auth:login', credentials),
    createUser: (username: string, password: string, fullName: string, role: User['role']) =>
      ipcRenderer.invoke('auth:create-user', username, password, fullName, role),
    updatePassword: (userId: number, oldPassword: string, newPassword: string) =>
      ipcRenderer.invoke('auth:update-password', userId, oldPassword, newPassword),
    getAllUsers: () => ipcRenderer.invoke('auth:get-all-users'),
    toggleUserStatus: (userId: number) =>
      ipcRenderer.invoke('auth:toggle-user-status', userId),
  },

  // Products API
  products: {
    getAllCategories: () => ipcRenderer.invoke('products:get-all-categories'),
    createCategory: (name: string, description?: string) =>
      ipcRenderer.invoke('products:create-category', name, description),
    updateCategory: (id: number, name: string, description?: string) =>
      ipcRenderer.invoke('products:update-category', id, name, description),
    deleteCategory: (id: number) =>
      ipcRenderer.invoke('products:delete-category', id),
    getAll: () => ipcRenderer.invoke('products:get-all'),
    getById: (id: number) => ipcRenderer.invoke('products:get-by-id', id),
    search: (query: string) => ipcRenderer.invoke('products:search', query),
    create: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) =>
      ipcRenderer.invoke('products:create', product),
    update: (id: number, product: Partial<Product>) =>
      ipcRenderer.invoke('products:update', id, product),
    delete: (id: number) => ipcRenderer.invoke('products:delete', id),
    updateStock: (id: number, quantity: number) =>
      ipcRenderer.invoke('products:update-stock', id, quantity),
    getLowStock: () => ipcRenderer.invoke('products:get-low-stock'),
  },

  // Sales API
  sales: {
    create: (
      userId: number,
      items: Array<{
        product_id: number;
        quantity: number;
        unit_price: number;
        discount?: number;
      }>,
      paymentMethod: Sale['payment_method'],
      discount?: number,
      tax?: number,
      notes?: string
    ) =>
      ipcRenderer.invoke('sales:create', userId, items, paymentMethod, discount, tax, notes),
    getById: (id: number) => ipcRenderer.invoke('sales:get-by-id', id),
    getAll: (limit?: number, offset?: number) =>
      ipcRenderer.invoke('sales:get-all', limit, offset),
    getByDateRange: (startDate: string, endDate: string) =>
      ipcRenderer.invoke('sales:get-by-date-range', startDate, endDate),
    getTodays: () => ipcRenderer.invoke('sales:get-todays'),
    getStats: (startDate?: string, endDate?: string) =>
      ipcRenderer.invoke('sales:get-stats', startDate, endDate),
    getTopSelling: (limit?: number) =>
      ipcRenderer.invoke('sales:get-top-selling', limit),
    refund: (saleId: number) => ipcRenderer.invoke('sales:refund', saleId),
  },
});

// Type definitions for window.electronAPI
declare global {
  interface Window {
    electronAPI: {
      auth: {
        login: (credentials: LoginCredentials) => Promise<any>;
        createUser: (
          username: string,
          password: string,
          fullName: string,
          role: User['role']
        ) => Promise<any>;
        updatePassword: (
          userId: number,
          oldPassword: string,
          newPassword: string
        ) => Promise<any>;
        getAllUsers: () => Promise<User[]>;
        toggleUserStatus: (userId: number) => Promise<any>;
      };
      products: {
        getAllCategories: () => Promise<Category[]>;
        createCategory: (name: string, description?: string) => Promise<any>;
        updateCategory: (id: number, name: string, description?: string) => Promise<any>;
        deleteCategory: (id: number) => Promise<any>;
        getAll: () => Promise<Product[]>;
        getById: (id: number) => Promise<Product | null>;
        search: (query: string) => Promise<Product[]>;
        create: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
        update: (id: number, product: Partial<Product>) => Promise<any>;
        delete: (id: number) => Promise<any>;
        updateStock: (id: number, quantity: number) => Promise<any>;
        getLowStock: () => Promise<Product[]>;
      };
      sales: {
        create: (
          userId: number,
          items: Array<{
            product_id: number;
            quantity: number;
            unit_price: number;
            discount?: number;
          }>,
          paymentMethod: Sale['payment_method'],
          discount?: number,
          tax?: number,
          notes?: string
        ) => Promise<any>;
        getById: (id: number) => Promise<any>;
        getAll: (limit?: number, offset?: number) => Promise<Sale[]>;
        getByDateRange: (startDate: string, endDate: string) => Promise<Sale[]>;
        getTodays: () => Promise<Sale[]>;
        getStats: (startDate?: string, endDate?: string) => Promise<any>;
        getTopSelling: (limit?: number) => Promise<any[]>;
        refund: (saleId: number) => Promise<any>;
      };
    };
  }
}
