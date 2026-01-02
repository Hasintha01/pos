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

// ============================================================================
// Phase 3: Multi-Store & Sync Types
// ============================================================================

export interface Store {
  id: number;
  store_code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Terminal {
  id: number;
  terminal_code: string;
  store_id: number;
  device_name: string;
  ip_address?: string;
  last_sync_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number;
  store_id: number;
  terminal_id?: number;
  entity_type: string;
  entity_id: number;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout';
  old_values?: string;
  new_values?: string;
  created_at: string;
}

export interface SyncOutbox {
  id: number;
  entity_type: string;
  entity_id: number;
  action: 'create' | 'update' | 'delete';
  data: string;
  store_id: number;
  terminal_id?: number;
  synced: boolean;
  sync_attempts: number;
  last_sync_attempt?: string;
  created_at: string;
}

export interface SyncState {
  id: number;
  terminal_id: number;
  last_pull_at?: string;
  last_push_at?: string;
  last_sync_version: number;
}
