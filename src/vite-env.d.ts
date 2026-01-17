/// <reference types="vite/client" />

import { User, Product, Category, Sale, LoginCredentials } from './shared/types';

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
      categories: {
        getAll: () => Promise<Category[]>;
        create: (name: string, description?: string) => Promise<any>;
        update: (id: number, name: string, description?: string) => Promise<any>;
        delete: (id: number) => Promise<any>;
      };
      products: {
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
      users: {
        getAll: () => Promise<User[]>;
        create: (data: any) => Promise<any>;
        update: (id: number, data: any) => Promise<any>;
        delete: (id: number) => Promise<any>;
      };
      audit: {
        getLogs: (filters: any) => Promise<any[]>;
      };
      sync: {
        manualSync: () => Promise<any>;
        configure: (config: any) => Promise<any>;
      };
    };
  }
}
