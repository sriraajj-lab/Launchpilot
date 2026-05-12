'use client';

import { useState } from 'react';
import { Plus, Eye, EyeOff, Trash2, Check, Key, Shield } from 'lucide-react';

interface StoredAccount {
  id: string;
  platform: string;
  username: string;
  isActive: boolean;
  lastUsed: string | null;
}

const mockAccounts: StoredAccount[] = [
  { id: '1', platform: 'Product Hunt', username: 'john@example.com', isActive: true, lastUsed: '2025-01-20' },
  { id: '2', platform: 'LinkedIn', username: 'john.doe@company.com', isActive: true, lastUsed: '2025-01-19' },
  { id: '3', platform: 'Reddit', username: 'throwaway_launch', isActive: true, lastUsed: '2025-01-18' },
  { id: '4', platform: 'Facebook', username: 'john@example.com', isActive: true, lastUsed: '2025-01-17' },
  { id: '5', platform: 'Instagram', username: 'myapp_official', isActive: false, lastUsed: null },
  { id: '6', platform: 'Twitter / X', username: '@myapp', isActive: true, lastUsed: '2025-01-15' },
  { id: '7', platform: 'Hacker News', username: 'john_hn', isActive: true, lastUsed: '2025-01-14' },
  { id: '8', platform: 'BetaList', username: 'john@example.com', isActive: true, lastUsed: null },
];

export default function AccountsPage() {
  const [accounts] = useState<StoredAccount[]>(mockAccounts);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAccount, setNewAccount] = useState({ platform: '', username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Manager</h1>
          <p className="text-gray-500 mt-1">Store encrypted credentials for platform automation</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
        >
          <Plus size={18} />
          Add Account
        </button>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Shield className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
        <div>
          <p className="text-sm font-medium text-blue-900">Credentials are encrypted at rest</p>
          <p className="text-sm text-blue-700">All passwords are encrypted using AES-256 with your ENCRYPTION_KEY environment variable. They never leave your machine.</p>
        </div>
      </div>

      {/* Add Account Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-medium text-gray-900 mb-4">Add New Account</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
              <select value={newAccount.platform} onChange={e => setNewAccount(p => ({ ...p, platform: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500">
                <option value="">Select platform...</option>
                <option value="linkedin">LinkedIn</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="twitter">Twitter / X</option>
                <option value="reddit">Reddit</option>
                <option value="product_hunt">Product Hunt</option>
                <option value="hackernews">Hacker News</option>
                <option value="betalist">BetaList</option>
                <option value="indie_hackers">Indie Hackers</option>
                <option value="crunchbase">Crunchbase</option>
                <option value="g2">G2</option>
                <option value="capterra">Capterra</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username / Email</label>
              <input type="text" value={newAccount.username} onChange={e => setNewAccount(p => ({ ...p, username: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                placeholder="your@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={newAccount.password}
                  onChange={e => setNewAccount(p => ({ ...p, password: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                  placeholder="••••••••" />
                <button onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium">
              Save Account
            </button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Accounts List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Used</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {accounts.map(account => (
              <tr key={account.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Key size={16} className="text-gray-400" />
                    <span className="font-medium text-gray-900">{account.platform}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {account.username}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {account.isActive ? <><Check size={12} /> Active</> : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {account.lastUsed || 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
