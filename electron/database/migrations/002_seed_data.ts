import { Database } from 'better-sqlite3';
import * as bcrypt from 'bcryptjs';

export function up(db: Database): void {
  // Create default admin user (password: admin123)
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  
  db.prepare(`
    INSERT INTO users (username, password_hash, full_name, role, is_active)
    VALUES (?, ?, ?, ?, ?)
  `).run('admin', hashedPassword, 'System Administrator', 'admin', 1);

  // Insert default categories
  const categories = [
    { name: 'Electronics', description: 'Electronic devices and accessories' },
    { name: 'Clothing', description: 'Apparel and fashion items' },
    { name: 'Food & Beverage', description: 'Food and drink products' },
    { name: 'Home & Garden', description: 'Home improvement and garden supplies' },
    { name: 'Books & Media', description: 'Books, magazines, and media' },
  ];

  const insertCategory = db.prepare(`
    INSERT INTO categories (name, description)
    VALUES (?, ?)
  `);

  for (const category of categories) {
    insertCategory.run(category.name, category.description);
  }

  console.log('Seed data inserted successfully');
}

export function down(db: Database): void {
  db.exec(`
    DELETE FROM sale_items;
    DELETE FROM sales;
    DELETE FROM products;
    DELETE FROM categories;
    DELETE FROM users;
  `);

  console.log('Seed data removed successfully');
}
