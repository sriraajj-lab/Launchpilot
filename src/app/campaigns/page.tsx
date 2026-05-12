'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Play, Pause, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  product: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  platforms: number;
  successCount: number;
  failCount: number;
  manualCount: number;
  createdAt: string;
}

const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'MyApp Full Launch',
    product: 'MyApp',
    status: 'completed',
    platforms: 22,
    successCount: 18,
    failCount: 2,
    manualCount: 2,
    createdAt: '2025-01-15',
  },
  {
    id: '2',
    name: 'ToolX Beta Launch',
    product: 'ToolX',
    status: 'running',
    platforms: 15,
    successCount: 8,
    failCount: 1,
    manualCount: 0,
    createdAt: '2025-01-20',
  },
  {
    id: '3',
    name: 'SaaSPro Directories Only',
    product: 'SaaSPro',
    status: 'draft',
    platforms: 10,
    successCount: 0,
    failCount: 0,
    manualCount: 0,
    createdAt: '2025-01-22',
  },
];

export default function CampaignsPage() {
  const [campaigns] = useState<Campaign[]>(mockCampaigns);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-500 mt-1">Manage your product launch campaigns</p>
        </div>
        <Link
          href="/campaigns/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
        >
          <Plus size={18} />
          New Campaign
        </Link>
      </div>

      {/* Campaign List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platforms</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Results</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {campaigns.map((campaign) => (
              <tr key={campaign.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <p className="font-medium text-gray-900">{campaign.name}</p>
                    <p className="text-sm text-gray-500">{campaign.product} &middot; {campaign.createdAt}</p>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <CampaignStatus status={campaign.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {campaign.platforms} platforms
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle size={14} /> {campaign.successCount}
                    </span>
                    <span className="flex items-center gap-1 text-red-600">
                      <AlertTriangle size={14} /> {campaign.failCount}
                    </span>
                    <span className="flex items-center gap-1 text-amber-600">
                      <Clock size={14} /> {campaign.manualCount}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {campaign.status === 'draft' && (
                      <button className="p-1.5 text-green-600 hover:bg-green-50 rounded">
                        <Play size={16} />
                      </button>
                    )}
                    {campaign.status === 'running' && (
                      <button className="p-1.5 text-amber-600 hover:bg-amber-50 rounded">
                        <Pause size={16} />
                      </button>
                    )}
                    <Link href={`/campaigns/${campaign.id}`} className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                      View
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CampaignStatus({ status }: { status: Campaign['status'] }) {
  const config = {
    draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
    running: { color: 'bg-blue-100 text-blue-800', label: 'Running' },
    paused: { color: 'bg-amber-100 text-amber-800', label: 'Paused' },
    completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
  };

  const { color, label } = config[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
