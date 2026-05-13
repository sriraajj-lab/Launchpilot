'use client';

import { useState } from 'react';
import { Plus, Eye, EyeOff, Trash2, Check, Key, Shield, Loader2 } from 'lucide-react';
import { useAccounts } from '@/lib/hooks';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const PLATFORM_OPTIONS = [
  'linkedin', 'facebook', 'instagram', 'twitter', 'reddit',
  'product_hunt', 'hackernews', 'betalist', 'indie_hackers',
  'crunchbase', 'g2', 'capterra', 'saashub', 'alternativeto',
  'angellist', 'devhunt', 'microlaunch',
];

export default function AccountsPage() {
  const { data: accounts, isLoading, mutate } = useAccounts();
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newAccount, setNewAccount] = useState({ platform: '', username: '', password: '' });

  const saveAccount = async () => {
    if (!newAccount.platform || !newAccount.username || !newAccount.password) {
      toast.error('All fields are required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccount),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Account saved (encrypted)');
      setNewAccount({ platform: '', username: '', password: '' });
      setShowAddForm(false);
      mutate();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async (id: string) => {
    if (!confirm('Delete this account?')) return;
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Account deleted');
      mutate();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-600" size={32} /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Manager</h1>
          <p className="text-gray-500 mt-1">Store encrypted credentials for platform automation</p>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium">
          <Plus size={18} /> Add Account
        </button>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Shield className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
        <div>
          <p className="text-sm font-medium text-blue-900">Credentials are encrypted at rest</p>
          <p className="text-sm text-blue-700">All passwords are encrypted using AES-256-GCM. They are decrypted only when running automations on the server.</p>
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
                {PLATFORM_OPTIONS.map(p => (
                  <option key={p} value={p}>{p.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username / Email</label>
              <input type="text" value={newAccount.username} onChange={e => setNewAccount(p => ({ ...p, username: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500" placeholder="your@email.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={newAccount.password}
                  onChange={e => setNewAccount(p => ({ ...p, password: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500" placeholder="••••••••" />
                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={saveAccount} disabled={saving} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Account'}
            </button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Accounts List */}
      {(!accounts || accounts.length === 0) ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Key className="mx-auto mb-3 text-gray-300" size={40} />
          <p className="text-gray-400">No accounts stored yet. Add platform credentials to enable automation.</p>
        </div>
      ) : (
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
            <tbody className="divide-y divide-gray-200">
              {accounts.map((account: any) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Key size={16} className="text-gray-400" />
                      <span className="font-medium text-gray-900">{account.platform.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{account.username}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {account.isActive ? <><Check size={12} /> Active</> : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{account.lastUsed ? formatDistanceToNow(new Date(account.lastUsed), { addSuffix: true }) : 'Never'}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => deleteAccount(account.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
