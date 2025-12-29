import Database from 'better-sqlite3';
import { Sale, SaleItem, Product } from '../../src/shared/types';

export class SalesService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  private generateSaleNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = now.getTime();
    return `SALE-${year}${month}${day}-${timestamp}`;
  }

  createSale(
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
  ): { success: boolean; message: string; sale?: Sale } {
    const transaction = this.db.transaction(() => {
      try {
        // Calculate totals
        let subtotal = 0;
        for (const item of items) {
          const itemDiscount = item.discount || 0;
          const itemSubtotal = item.quantity * item.unit_price - itemDiscount;
          subtotal += itemSubtotal;
        }

        const discountAmount = discount || 0;
        const taxAmount = tax || 0;
        const totalAmount = subtotal - discountAmount + taxAmount;

        // Generate sale number
        const saleNumber = this.generateSaleNumber();

        // Insert sale
        const saleResult = this.db
          .prepare(
            `INSERT INTO sales (sale_number, user_id, total_amount, tax_amount, discount_amount, payment_method, payment_status, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            saleNumber,
            userId,
            totalAmount,
            taxAmount,
            discountAmount,
            paymentMethod,
            'completed',
            notes || null
          );

        const saleId = saleResult.lastInsertRowid as number;

        // Insert sale items and update stock
        const insertItem = this.db.prepare(
          `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal, discount)
           VALUES (?, ?, ?, ?, ?, ?)`
        );

        const updateStock = this.db.prepare(
          `UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?`
        );

        for (const item of items) {
          const itemDiscount = item.discount || 0;
          const itemSubtotal = item.quantity * item.unit_price - itemDiscount;

          insertItem.run(
            saleId,
            item.product_id,
            item.quantity,
            item.unit_price,
            itemSubtotal,
            itemDiscount
          );

          updateStock.run(item.quantity, item.product_id);
        }

        const sale: Sale = {
          id: saleId,
          sale_number: saleNumber,
          user_id: userId,
          total_amount: totalAmount,
          tax_amount: taxAmount,
          discount_amount: discountAmount,
          payment_method: paymentMethod,
          payment_status: 'completed',
          notes: notes || undefined,
          created_at: new Date().toISOString(),
        };

        return {
          success: true,
          message: 'Sale created successfully',
          sale,
        };
      } catch (error) {
        console.error('Create sale error:', error);
        throw error;
      }
    });

    try {
      return transaction();
    } catch (error) {
      return {
        success: false,
        message: 'An error occurred while creating sale',
      };
    }
  }

  getSaleById(id: number): (Sale & { items: SaleItem[] }) | null {
    try {
      const sale = this.db
        .prepare(
          `SELECT s.*, u.full_name as user_name
           FROM sales s
           LEFT JOIN users u ON s.user_id = u.id
           WHERE s.id = ?`
        )
        .get(id) as Sale & { user_name: string } | undefined;

      if (!sale) return null;

      const items = this.db
        .prepare(
          `SELECT si.*, p.name as product_name, p.sku
           FROM sale_items si
           LEFT JOIN products p ON si.product_id = p.id
           WHERE si.sale_id = ?`
        )
        .all(id) as SaleItem[];

      return { ...sale, items };
    } catch (error) {
      console.error('Get sale by ID error:', error);
      return null;
    }
  }

  getAllSales(limit: number = 100, offset: number = 0): Sale[] {
    try {
      const sales = this.db
        .prepare(
          `SELECT s.*, u.full_name as user_name
           FROM sales s
           LEFT JOIN users u ON s.user_id = u.id
           ORDER BY s.created_at DESC
           LIMIT ? OFFSET ?`
        )
        .all(limit, offset) as Sale[];

      return sales;
    } catch (error) {
      console.error('Get all sales error:', error);
      return [];
    }
  }

  getSalesByDateRange(startDate: string, endDate: string): Sale[] {
    try {
      const sales = this.db
        .prepare(
          `SELECT s.*, u.full_name as user_name
           FROM sales s
           LEFT JOIN users u ON s.user_id = u.id
           WHERE DATE(s.created_at) BETWEEN DATE(?) AND DATE(?)
           ORDER BY s.created_at DESC`
        )
        .all(startDate, endDate) as Sale[];

      return sales;
    } catch (error) {
      console.error('Get sales by date range error:', error);
      return [];
    }
  }

  getTodaysSales(): Sale[] {
    try {
      const today = new Date().toISOString().split('T')[0];
      return this.getSalesByDateRange(today, today);
    } catch (error) {
      console.error('Get todays sales error:', error);
      return [];
    }
  }

  getSalesStats(startDate?: string, endDate?: string): {
    total_sales: number;
    total_revenue: number;
    total_transactions: number;
    average_transaction: number;
  } {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_transactions,
          SUM(total_amount) as total_revenue,
          AVG(total_amount) as average_transaction
        FROM sales
        WHERE payment_status = 'completed'
      `;

      const params: string[] = [];

      if (startDate && endDate) {
        query += ` AND DATE(created_at) BETWEEN DATE(?) AND DATE(?)`;
        params.push(startDate, endDate);
      }

      const stats = this.db.prepare(query).get(...params) as {
        total_transactions: number;
        total_revenue: number;
        average_transaction: number;
      };

      return {
        total_sales: stats.total_transactions,
        total_revenue: stats.total_revenue || 0,
        total_transactions: stats.total_transactions,
        average_transaction: stats.average_transaction || 0,
      };
    } catch (error) {
      console.error('Get sales stats error:', error);
      return {
        total_sales: 0,
        total_revenue: 0,
        total_transactions: 0,
        average_transaction: 0,
      };
    }
  }

  getTopSellingProducts(limit: number = 10): Array<Product & { total_sold: number; revenue: number }> {
    try {
      const products = this.db
        .prepare(
          `SELECT 
            p.*,
            SUM(si.quantity) as total_sold,
            SUM(si.subtotal) as revenue
           FROM sale_items si
           JOIN products p ON si.product_id = p.id
           JOIN sales s ON si.sale_id = s.id
           WHERE s.payment_status = 'completed'
           GROUP BY si.product_id
           ORDER BY total_sold DESC
           LIMIT ?`
        )
        .all(limit) as Array<Product & { total_sold: number; revenue: number }>;

      return products;
    } catch (error) {
      console.error('Get top selling products error:', error);
      return [];
    }
  }

  refundSale(saleId: number): { success: boolean; message: string } {
    const transaction = this.db.transaction(() => {
      try {
        // Get sale items
        const items = this.db
          .prepare('SELECT product_id, quantity FROM sale_items WHERE sale_id = ?')
          .all(saleId) as Array<{ product_id: number; quantity: number }>;

        // Update sale status
        this.db
          .prepare(`UPDATE sales SET payment_status = 'refunded' WHERE id = ?`)
          .run(saleId);

        // Restore stock
        const updateStock = this.db.prepare(
          `UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?`
        );

        for (const item of items) {
          updateStock.run(item.quantity, item.product_id);
        }

        return { success: true, message: 'Sale refunded successfully' };
      } catch (error) {
        console.error('Refund sale error:', error);
        throw error;
      }
    });

    try {
      return transaction();
    } catch (error) {
      return {
        success: false,
        message: 'An error occurred while refunding sale',
      };
    }
  }
}
