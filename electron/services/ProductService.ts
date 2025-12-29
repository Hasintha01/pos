import Database from 'better-sqlite3';
import { Product, Category } from '../../src/shared/types';

export class ProductService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  // Category Methods
  getAllCategories(): Category[] {
    try {
      const categories = this.db
        .prepare(
          `SELECT id, name, description, created_at, updated_at
           FROM categories
           ORDER BY name ASC`
        )
        .all() as Category[];

      return categories;
    } catch (error) {
      console.error('Get all categories error:', error);
      return [];
    }
  }

  createCategory(name: string, description?: string): { success: boolean; message: string; category?: Category } {
    try {
      const result = this.db
        .prepare(
          `INSERT INTO categories (name, description)
           VALUES (?, ?)`
        )
        .run(name, description || null);

      const category: Category = {
        id: result.lastInsertRowid as number,
        name,
        description: description || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return {
        success: true,
        message: 'Category created successfully',
        category,
      };
    } catch (error: any) {
      console.error('Create category error:', error);
      if (error.code === 'SQLITE_CONSTRAINT') {
        return { success: false, message: 'Category name already exists' };
      }
      return { success: false, message: 'An error occurred while creating category' };
    }
  }

  updateCategory(id: number, name: string, description?: string): { success: boolean; message: string } {
    try {
      this.db
        .prepare(
          `UPDATE categories 
           SET name = ?, description = ?, updated_at = datetime('now')
           WHERE id = ?`
        )
        .run(name, description || null, id);

      return { success: true, message: 'Category updated successfully' };
    } catch (error: any) {
      console.error('Update category error:', error);
      if (error.code === 'SQLITE_CONSTRAINT') {
        return { success: false, message: 'Category name already exists' };
      }
      return { success: false, message: 'An error occurred while updating category' };
    }
  }

  deleteCategory(id: number): { success: boolean; message: string } {
    try {
      // Check if category has products
      const productCount = this.db
        .prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?')
        .get(id) as { count: number };

      if (productCount.count > 0) {
        return {
          success: false,
          message: 'Cannot delete category with existing products',
        };
      }

      this.db.prepare('DELETE FROM categories WHERE id = ?').run(id);

      return { success: true, message: 'Category deleted successfully' };
    } catch (error) {
      console.error('Delete category error:', error);
      return { success: false, message: 'An error occurred while deleting category' };
    }
  }

  // Product Methods
  getAllProducts(): Product[] {
    try {
      const products = this.db
        .prepare(
          `SELECT p.*, c.name as category_name
           FROM products p
           LEFT JOIN categories c ON p.category_id = c.id
           ORDER BY p.name ASC`
        )
        .all() as (Product & { category_name?: string })[];

      return products.map(product => ({
        ...product,
        is_active: Boolean(product.is_active),
      }));
    } catch (error) {
      console.error('Get all products error:', error);
      return [];
    }
  }

  getProductById(id: number): Product | null {
    try {
      const product = this.db
        .prepare(
          `SELECT p.*, c.name as category_name
           FROM products p
           LEFT JOIN categories c ON p.category_id = c.id
           WHERE p.id = ?`
        )
        .get(id) as Product | undefined;

      if (!product) return null;

      return {
        ...product,
        is_active: Boolean(product.is_active),
      };
    } catch (error) {
      console.error('Get product by ID error:', error);
      return null;
    }
  }

  searchProducts(query: string): Product[] {
    try {
      const products = this.db
        .prepare(
          `SELECT p.*, c.name as category_name
           FROM products p
           LEFT JOIN categories c ON p.category_id = c.id
           WHERE p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?
           ORDER BY p.name ASC
           LIMIT 50`
        )
        .all(`%${query}%`, `%${query}%`, `%${query}%`) as Product[];

      return products.map(product => ({
        ...product,
        is_active: Boolean(product.is_active),
      }));
    } catch (error) {
      console.error('Search products error:', error);
      return [];
    }
  }

  createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): { success: boolean; message: string; product?: Product } {
    try {
      const result = this.db
        .prepare(
          `INSERT INTO products (name, sku, barcode, category_id, price, cost, stock_quantity, min_stock_level, description, image_url, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          product.name,
          product.sku,
          product.barcode || null,
          product.category_id || null,
          product.price,
          product.cost || 0,
          product.stock_quantity || 0,
          product.min_stock_level || 0,
          product.description || null,
          product.image_url || null,
          product.is_active ? 1 : 0
        );

      const newProduct: Product = {
        ...product,
        id: result.lastInsertRowid as number,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return {
        success: true,
        message: 'Product created successfully',
        product: newProduct,
      };
    } catch (error: any) {
      console.error('Create product error:', error);
      if (error.code === 'SQLITE_CONSTRAINT') {
        return { success: false, message: 'SKU or barcode already exists' };
      }
      return { success: false, message: 'An error occurred while creating product' };
    }
  }

  updateProduct(id: number, product: Partial<Product>): { success: boolean; message: string } {
    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (product.name !== undefined) {
        updates.push('name = ?');
        values.push(product.name);
      }
      if (product.sku !== undefined) {
        updates.push('sku = ?');
        values.push(product.sku);
      }
      if (product.barcode !== undefined) {
        updates.push('barcode = ?');
        values.push(product.barcode || null);
      }
      if (product.category_id !== undefined) {
        updates.push('category_id = ?');
        values.push(product.category_id || null);
      }
      if (product.price !== undefined) {
        updates.push('price = ?');
        values.push(product.price);
      }
      if (product.cost !== undefined) {
        updates.push('cost = ?');
        values.push(product.cost);
      }
      if (product.stock_quantity !== undefined) {
        updates.push('stock_quantity = ?');
        values.push(product.stock_quantity);
      }
      if (product.min_stock_level !== undefined) {
        updates.push('min_stock_level = ?');
        values.push(product.min_stock_level);
      }
      if (product.description !== undefined) {
        updates.push('description = ?');
        values.push(product.description || null);
      }
      if (product.image_url !== undefined) {
        updates.push('image_url = ?');
        values.push(product.image_url || null);
      }
      if (product.is_active !== undefined) {
        updates.push('is_active = ?');
        values.push(product.is_active ? 1 : 0);
      }

      if (updates.length === 0) {
        return { success: false, message: 'No fields to update' };
      }

      updates.push("updated_at = datetime('now')");
      values.push(id);

      this.db
        .prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`)
        .run(...values);

      return { success: true, message: 'Product updated successfully' };
    } catch (error: any) {
      console.error('Update product error:', error);
      if (error.code === 'SQLITE_CONSTRAINT') {
        return { success: false, message: 'SKU or barcode already exists' };
      }
      return { success: false, message: 'An error occurred while updating product' };
    }
  }

  deleteProduct(id: number): { success: boolean; message: string } {
    try {
      // Check if product is used in any sales
      const salesCount = this.db
        .prepare('SELECT COUNT(*) as count FROM sale_items WHERE product_id = ?')
        .get(id) as { count: number };

      if (salesCount.count > 0) {
        return {
          success: false,
          message: 'Cannot delete product with existing sales records',
        };
      }

      this.db.prepare('DELETE FROM products WHERE id = ?').run(id);

      return { success: true, message: 'Product deleted successfully' };
    } catch (error) {
      console.error('Delete product error:', error);
      return { success: false, message: 'An error occurred while deleting product' };
    }
  }

  updateStock(id: number, quantity: number): { success: boolean; message: string } {
    try {
      this.db
        .prepare(
          `UPDATE products 
           SET stock_quantity = stock_quantity + ?, updated_at = datetime('now')
           WHERE id = ?`
        )
        .run(quantity, id);

      return { success: true, message: 'Stock updated successfully' };
    } catch (error) {
      console.error('Update stock error:', error);
      return { success: false, message: 'An error occurred while updating stock' };
    }
  }

  getLowStockProducts(): Product[] {
    try {
      const products = this.db
        .prepare(
          `SELECT p.*, c.name as category_name
           FROM products p
           LEFT JOIN categories c ON p.category_id = c.id
           WHERE p.stock_quantity <= p.min_stock_level AND p.is_active = 1
           ORDER BY p.stock_quantity ASC`
        )
        .all() as Product[];

      return products.map(product => ({
        ...product,
        is_active: Boolean(product.is_active),
      }));
    } catch (error) {
      console.error('Get low stock products error:', error);
      return [];
    }
  }
}
