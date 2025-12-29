/**
 * Shared Type Definitions
 */

// ============================================================================
// User & Authentication Types
// ============================================================================

export type UserRole = 'admin' | 'cashier' | 'manager';

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  message?: string;
}

// ============================================================================
// Category Types
// ============================================================================

export interface Category {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Product Types
// ============================================================================

export interface Product {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  category_id?: number;
  category_name?: string;
  price: number;
  cost: number;
  stock_quantity: number;
  min_stock_level?: number;
  description?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Sales Types
// ============================================================================

export interface Sale {
  id: number;
  sale_number: string;
  user_id: number;
  user_name?: string;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  payment_method: 'cash' | 'card' | 'mobile';
  payment_status: 'completed' | 'pending' | 'refunded';
  notes?: string;
  created_at: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  product_name?: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  discount: number;
  created_at: string;
}
