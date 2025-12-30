/**
 * Database Viewer Script
 * Run: node view-database.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'pos-database.db');

try {
  const db = new Database(dbPath, { readonly: true });
  
  console.log('\n📊 DATABASE VIEWER\n');
  console.log(`Database: ${dbPath}\n`);
  
  // Show all tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('📋 Tables:', tables.map(t => t.name).join(', '));
  console.log('\n' + '='.repeat(80) + '\n');
  
  // Users
  console.log('👥 USERS:');
  const users = db.prepare('SELECT id, username, full_name, role, is_active FROM users').all();
  console.table(users);
  
  // Categories
  console.log('\n📁 CATEGORIES:');
  const categories = db.prepare('SELECT * FROM categories').all();
  console.table(categories);
  
  // Products
  console.log('\n📦 PRODUCTS:');
  const products = db.prepare(`
    SELECT p.id, p.name, p.sku, p.price, p.stock_quantity, c.name as category 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    LIMIT 20
  `).all();
  console.table(products);
  
  // Sales Summary
  console.log('\n💰 SALES SUMMARY:');
  const salesSummary = db.prepare(`
    SELECT 
      COUNT(*) as total_sales,
      SUM(total_amount) as total_revenue,
      AVG(total_amount) as avg_sale
    FROM sales
  `).get();
  console.table([salesSummary]);
  
  // Recent Sales
  console.log('\n🛒 RECENT SALES (Last 10):');
  const recentSales = db.prepare(`
    SELECT s.id, s.sale_number, s.total_amount, s.payment_method, s.created_at, u.username
    FROM sales s
    LEFT JOIN users u ON s.user_id = u.id
    ORDER BY s.created_at DESC
    LIMIT 10
  `).all();
  console.table(recentSales);
  
  db.close();
  console.log('\n✅ Database closed successfully\n');
  
} catch (error) {
  if (error.code === 'SQLITE_CANTOPEN') {
    console.error('\n❌ Database file not found!');
    console.log('💡 Run the app first (npm run dev) to create the database.\n');
  } else {
    console.error('\n❌ Error:', error.message, '\n');
  }
}
