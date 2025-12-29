import Database from 'better-sqlite3';
import * as bcrypt from 'bcryptjs';
import { User, LoginCredentials, AuthResponse } from '../../src/shared/types';

export class AuthService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const user = this.db
        .prepare(
          `SELECT id, username, password_hash, full_name, role, is_active 
           FROM users 
           WHERE username = ?`
        )
        .get(credentials.username) as User & { password_hash: string };

      if (!user) {
        return {
          success: false,
          message: 'Invalid username or password',
        };
      }

      if (!user.is_active) {
        return {
          success: false,
          message: 'User account is inactive',
        };
      }

      const isPasswordValid = await bcrypt.compare(
        credentials.password,
        user.password_hash
      );

      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid username or password',
        };
      }

      // Remove password_hash from user object
      const { password_hash, ...userWithoutPassword } = user;

      return {
        success: true,
        message: 'Login successful',
        user: userWithoutPassword,
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'An error occurred during login',
      };
    }
  }

  async createUser(
    username: string,
    password: string,
    fullName: string,
    role: User['role']
  ): Promise<AuthResponse> {
    try {
      // Check if username already exists
      const existingUser = this.db
        .prepare('SELECT id FROM users WHERE username = ?')
        .get(username);

      if (existingUser) {
        return {
          success: false,
          message: 'Username already exists',
        };
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const result = this.db
        .prepare(
          `INSERT INTO users (username, password_hash, full_name, role)
           VALUES (?, ?, ?, ?)`
        )
        .run(username, passwordHash, fullName, role);

      const user: User = {
        id: result.lastInsertRowid as number,
        username,
        full_name: fullName,
        role,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return {
        success: true,
        message: 'User created successfully',
        user,
      };
    } catch (error) {
      console.error('Create user error:', error);
      return {
        success: false,
        message: 'An error occurred while creating user',
      };
    }
  }

  async updatePassword(
    userId: number,
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = this.db
        .prepare('SELECT password_hash FROM users WHERE id = ?')
        .get(userId) as { password_hash: string } | undefined;

      if (!user) {
        return { success: false, message: 'User not found' };
      }

      const isPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);

      if (!isPasswordValid) {
        return { success: false, message: 'Current password is incorrect' };
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      this.db
        .prepare(
          `UPDATE users 
           SET password_hash = ?, updated_at = datetime('now')
           WHERE id = ?`
        )
        .run(newPasswordHash, userId);

      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      console.error('Update password error:', error);
      return { success: false, message: 'An error occurred while updating password' };
    }
  }

  getAllUsers(): User[] {
    try {
      const users = this.db
        .prepare(
          `SELECT id, username, full_name, role, is_active, created_at, updated_at
           FROM users
           ORDER BY created_at DESC`
        )
        .all() as User[];

      return users;
    } catch (error) {
      console.error('Get all users error:', error);
      return [];
    }
  }

  toggleUserStatus(userId: number): { success: boolean; message: string } {
    try {
      this.db
        .prepare(
          `UPDATE users 
           SET is_active = NOT is_active, updated_at = datetime('now')
           WHERE id = ?`
        )
        .run(userId);

      return { success: true, message: 'User status updated successfully' };
    } catch (error) {
      console.error('Toggle user status error:', error);
      return { success: false, message: 'An error occurred while updating user status' };
    }
  }
}
