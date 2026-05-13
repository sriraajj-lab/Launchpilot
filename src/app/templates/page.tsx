'use client';

import { useState } from 'react';
import { FileText, Plus, Copy, Trash2, Loader2 } from 'lucide-react';
import { useTemplates } from '@/lib/hooks';
import { toast } from 'sonner';

export default function TemplatesPage() {
  const { data, isLoading, mutate } = useTemplates();
  const [showCreate, setShowCreate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', platform: '', type: 'post', content: '' });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'defaults' | 'custom'>('defaults');

  const createTemplate = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Template created');
      setShowCreate(false);
      setNewTemplate({ name: '', platform: '', type: 'post', content: '' });
      mutate();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const copyTemplate = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-600" size={32} /></div>;
  }

  const defaults = data?.defaults || [];
  const custom = data?.custom || [];
  const templates = activeTab === 'defaults' ? defaults : custom;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="text-brand-600" size={28} />
            Content Templates
          </h1>
          <p className="text-gray-500 mt-1">Pre-built templates for posts, DMs, and directory descriptions</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium">
          <Plus size={18} /> New Template
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button onClick={() => setActiveTab('defaults')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'defaults' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
          Default Templates ({defaults.length})
        </button>
        <button onClick={() => setActiveTab('custom')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'custom' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
          My Templates ({custom.length})
        </button>
      </div>

      {/* Create Template Form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-medium text-gray-900 mb-4">Create New Template</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={newTemplate.name} onChange={e => setNewTemplate(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="My Reddit Template" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                <select value={newTemplate.platform} onChange={e => setNewTemplate(p => ({ ...p, platform: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="">Select...</option><option value="reddit">Reddit</option><option value="twitter">Twitter</option><option value="linkedin">LinkedIn</option><option value="hackernews">Hacker News</option><option value="directory">Directory</option><option value="email">Email</option>
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={newTemplate.type} onChange={e => setNewTemplate(p => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="post">Post</option><option value="dm">DM</option><option value="description">Description</option><option value="bio">Bio</option><option value="thread">Thread</option><option value="comment">Comment</option>
                </select></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Content <span className="text-gray-400">(use {"{{name}}"}, {"{{tagline}}"}, {"{{url}}"}, {"{{description}}"} as variables)</span></label>
              <textarea value={newTemplate.content} onChange={e => setNewTemplate(p => ({ ...p, content: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg h-40 font-mono text-sm" placeholder="Write your template here..." /></div>
            <div className="flex gap-2">
              <button onClick={createTemplate} disabled={saving} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium disabled:opacity-50">{saving ? 'Saving...' : 'Save Template'}</button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Template List */}
      <div className="space-y-4">
        {templates.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FileText className="mx-auto mb-3 text-gray-300" size={40} />
            <p className="text-gray-400">{activeTab === 'custom' ? 'No custom templates yet' : 'No templates available'}</p>
          </div>
        ) : (
          templates.map((template: any) => (
            <div key={template.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-gray-900">{template.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full">{template.platform}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{template.type}</span>
                    {template.isDefault && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Default</span>}
                  </div>
                </div>
                <button onClick={() => copyTemplate(template.content)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg" title="Copy">
                  <Copy size={16} />
                </button>
              </div>
              <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">{template.content}</pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
