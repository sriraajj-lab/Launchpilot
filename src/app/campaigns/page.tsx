'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Play, Pause, CheckCircle, Clock, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { useCampaigns } from '@/lib/hooks';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function CampaignsPage() {
  const { data: campaigns, isLoading, mutate } = useCampaigns();

  const launchCampaign = async (id: string) => {
    try {
      const res = await fetch(`/api/campaigns/${id}/launch`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Campaign launched!');
      mutate();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm('Delete this campaign and all its submissions?')) return;
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Campaign deleted');
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
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-500 mt-1">Manage your product launch campaigns</p>
        </div>
        <Link href="/campaigns/new" className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium">
          <Plus size={18} /> New Campaign
        </Link>
      </div>

      {(!campaigns || campaigns.length === 0) ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 mb-4">No campaigns yet</p>
          <Link href="/campaigns/new" className="text-brand-600 hover:text-brand-700 font-medium">Create your first campaign</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platforms</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Results</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {campaigns.map((campaign: any) => (
                <tr key={campaign.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{campaign.name}</p>
                      <p className="text-sm text-gray-500">{campaign.product?.name} &middot; {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true })}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4"><CampaignStatus status={campaign.status} /></td>
                  <td className="px-6 py-4 text-sm text-gray-700">{campaign.submissions?.length || 0} platforms</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1 text-green-600"><CheckCircle size={14} /> {campaign.stats?.success || 0}</span>
                      <span className="flex items-center gap-1 text-red-600"><AlertTriangle size={14} /> {campaign.stats?.failed || 0}</span>
                      <span className="flex items-center gap-1 text-amber-600"><Clock size={14} /> {campaign.stats?.manual || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {campaign.status === 'draft' && (
                        <button onClick={() => launchCampaign(campaign.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Launch">
                          <Play size={16} />
                        </button>
                      )}
                      <Link href={`/campaigns/${campaign.id}`} className="text-sm text-brand-600 hover:text-brand-700 font-medium">View</Link>
                      <button onClick={() => deleteCampaign(campaign.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
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

function CampaignStatus({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
    queued: { color: 'bg-indigo-100 text-indigo-800', label: 'Queued' },
    running: { color: 'bg-blue-100 text-blue-800', label: 'Running' },
    paused: { color: 'bg-amber-100 text-amber-800', label: 'Paused' },
    completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
    failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
  };
  const { color, label } = config[status] || config.draft;
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>{label}</span>;
}
