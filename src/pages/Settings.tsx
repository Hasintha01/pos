import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ServerIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface User {
  id: number;
  username: string;
  role: 'admin' | 'cashier' | 'manager';
  created_at: string;
}

interface SyncConfig {
  serverUrl: string;
  autoSync: boolean;
  syncInterval: number;
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'sync' | 'users' | 'system'>('sync');
  
  // Sync Settings
  const [syncConfig, setSyncConfig] = useState<SyncConfig>({
    serverUrl: 'http://localhost:3001',
    autoSync: true,
    syncInterval: 30,
  });
  const [syncStatus, setSyncStatus] = useState<string>('');
  
  // User Management
  const [users, setUsers] = useState<User[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'cashier' as 'admin' | 'cashier' | 'manager',
  });

  // System Settings
  const [systemSettings, setSystemSettings] = useState({
    taxRate: 0,
    currency: 'USD',
    receiptFooter: 'Thank you for your business!',
    lowStockThreshold: 10,
  });

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    try {
      const data = await window.electronAPI.users.getAll();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSyncTest = async () => {
    setSyncStatus('Testing connection...');
    try {
      const response = await fetch(`${syncConfig.serverUrl}/api/health`);
      if (response.ok) {
        setSyncStatus('✅ Connection successful');
      } else {
        setSyncStatus('❌ Server responded with error');
      }
    } catch (error) {
      setSyncStatus('❌ Connection failed');
    }
  };

  const handleSyncNow = async () => {
    setSyncStatus('Syncing...');
    try {
      await window.electronAPI.sync.manualSync();
      setSyncStatus('✅ Sync completed');
    } catch (error) {
      setSyncStatus('❌ Sync failed');
    }
  };

  const handleSaveSyncConfig = async () => {
    try {
      await window.electronAPI.sync.configure(syncConfig);
      alert('Sync settings saved successfully');
    } catch (error) {
      alert('Failed to save sync settings');
    }
  };

  const handleOpenUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        username: user.username,
        password: '',
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setUserForm({
        username: '',
        password: '',
        role: 'cashier',
      });
    }
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.username || (!editingUser && !userForm.password)) {
      alert('Username and password are required');
      return;
    }

    try {
      if (editingUser) {
        await window.electronAPI.users.update(editingUser.id, userForm);
      } else {
        await window.electronAPI.users.create(userForm);
      }
      
      setShowUserModal(false);
      loadUsers();
      alert('User saved successfully');
    } catch (error) {
      alert('Failed to save user');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await window.electronAPI.users.delete(userId);
      loadUsers();
      alert('User deleted successfully');
    } catch (error) {
      alert('Failed to delete user');
    }
  };

  const handleSaveSystemSettings = () => {
    localStorage.setItem('systemSettings', JSON.stringify(systemSettings));
    alert('System settings saved successfully');
  };

  useEffect(() => {
    const saved = localStorage.getItem('systemSettings');
    if (saved) {
      setSystemSettings(JSON.parse(saved));
    }
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Settings</h1>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('sync')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'sync'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <ServerIcon className="w-5 h-5" />
            Sync Server
          </button>
          
          {user?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'users'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <UserGroupIcon className="w-5 h-5" />
              User Management
            </button>
          )}
          
          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'system'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Cog6ToothIcon className="w-5 h-5" />
            System
          </button>
        </div>

        <div className="p-6">
          {/* Sync Server Tab */}
          {activeTab === 'sync' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Server URL
                </label>
                <input
                  type="text"
                  value={syncConfig.serverUrl}
                  onChange={(e) => setSyncConfig({ ...syncConfig, serverUrl: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="http://localhost:3001"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={syncConfig.autoSync}
                    onChange={(e) => setSyncConfig({ ...syncConfig, autoSync: e.target.checked })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable Auto Sync</span>
                </label>
              </div>

              {syncConfig.autoSync && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sync Interval (seconds)
                  </label>
                  <input
                    type="number"
                    value={syncConfig.syncInterval}
                    onChange={(e) => setSyncConfig({ ...syncConfig, syncInterval: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    min="10"
                    max="300"
                  />
                </div>
              )}

              {syncStatus && (
                <div className={`p-4 rounded-lg ${
                  syncStatus.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  {syncStatus}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleSyncTest}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Test Connection
                </button>
                <button
                  onClick={handleSyncNow}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Sync Now
                </button>
                <button
                  onClick={handleSaveSyncConfig}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Save Settings
                </button>
              </div>
            </div>
          )}

          {/* User Management Tab */}
          {activeTab === 'users' && user?.role === 'admin' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">Users</h2>
                <button
                  onClick={() => handleOpenUserModal()}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <PlusIcon className="w-5 h-5" />
                  Add User
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Username
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map(u => (
                      <tr key={u.id}>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-800">
                          {u.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            u.role === 'admin' ? 'bg-red-100 text-red-800' :
                            u.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleOpenUserModal(u)}
                            className="text-blue-600 hover:text-blue-800 mr-3"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          {u.id !== user.id && (
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* System Settings Tab */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  value={systemSettings.taxRate}
                  onChange={(e) => setSystemSettings({ ...systemSettings, taxRate: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  step="0.01"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={systemSettings.currency}
                  onChange={(e) => setSystemSettings({ ...systemSettings, currency: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Receipt Footer Text
                </label>
                <textarea
                  value={systemSettings.receiptFooter}
                  onChange={(e) => setSystemSettings({ ...systemSettings, receiptFooter: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Low Stock Alert Threshold
                </label>
                <input
                  type="number"
                  value={systemSettings.lowStockThreshold}
                  onChange={(e) => setSystemSettings({ ...systemSettings, lowStockThreshold: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  min="0"
                />
              </div>

              <button
                onClick={handleSaveSystemSettings}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Save Settings
              </button>
            </div>
          )}
        </div>
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                {editingUser ? 'Edit User' : 'Add User'}
              </h3>
              <button onClick={() => setShowUserModal(false)}>
                <XMarkIcon className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password {editingUser && '(leave blank to keep current)'}
                </label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveUser}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
