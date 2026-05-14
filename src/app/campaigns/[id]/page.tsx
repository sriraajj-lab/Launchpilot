'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Play, Pause, CheckCircle, XCircle, Clock, AlertTriangle,
  Loader2, ExternalLink, RotateCcw, Globe, Zap
} from 'lucide-react';
import { useCampaign } from '@/lib/hooks';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params.id as string;
  const { data: campaign, isLoading, mutate } = useCampaign(campaignId);

  const launchCampaign = async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/launch`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Campaign launched!');
      mutate();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const retrySubmission = async (submissionId: string) => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/submissions/${submissionId}/retry`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Submission queued for retry');
      mutate();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Campaign not found</p>
        <Link href="/campaigns" className="text-brand-600 hover:text-brand-700 font-medium">
          Back to Campaigns
        </Link>
      </div>
    );
  }

  const stats = {
    total: campaign.submissions?.length || 0,
    success: campaign.submissions?.filter((s: any) => s.status === 'success').length || 0,
    failed: campaign.submissions?.filter((s: any) => s.status === 'failed').length || 0,
    pending: campaign.submissions?.filter((s: any) => ['pending', 'queued', 'running'].includes(s.status)).length || 0,
    manual: campaign.submissions?.filter((s: any) => ['captcha_needed', 'manual_needed'].includes(s.status)).length || 0,
  };

  const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/campaigns" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            <p className="text-gray-500 mt-0.5">
              {campaign.product?.name} &middot; Created {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <CampaignStatusBadge status={campaign.status} />
          {(campaign.status === 'draft' || campaign.status === 'failed') && (
            <button
              onClick={launchCampaign}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
            >
              <Play size={16} /> Launch
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total" value={stats.total} icon={<Globe size={18} />} color="text-gray-600 bg-gray-50" />
        <StatCard label="Success" value={stats.success} icon={<CheckCircle size={18} />} color="text-green-600 bg-green-50" />
        <StatCard label="Failed" value={stats.failed} icon={<XCircle size={18} />} color="text-red-600 bg-red-50" />
        <StatCard label="Pending" value={stats.pending} icon={<Clock size={18} />} color="text-amber-600 bg-amber-50" />
        <StatCard label="Needs Action" value={stats.manual} icon={<AlertTriangle size={18} />} color="text-purple-600 bg-purple-50" />
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-500">{stats.success} / {stats.total} completed ({successRate}%)</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className="flex h-3 rounded-full overflow-hidden">
            <div className="bg-green-500 transition-all" style={{ width: `${(stats.success / stats.total) * 100}%` }} />
            <div className="bg-red-500 transition-all" style={{ width: `${(stats.failed / stats.total) * 100}%` }} />
            <div className="bg-amber-500 transition-all" style={{ width: `${(stats.pending / stats.total) * 100}%` }} />
            <div className="bg-purple-500 transition-all" style={{ width: `${(stats.manual / stats.total) * 100}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Success</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Failed</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Pending</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Needs Action</span>
        </div>
      </div>

      {/* Campaign Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Product</h3>
          <p className="font-medium text-gray-900">{campaign.product?.name || 'N/A'}</p>
          {campaign.product?.url && (
            <a href={campaign.product.url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1 mt-1">
              {campaign.product.url} <ExternalLink size={12} />
            </a>
          )}
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Schedule</h3>
          <p className="font-medium text-gray-900">
            {campaign.scheduledAt ? new Date(campaign.scheduledAt).toLocaleString() : 'Started immediately'}
          </p>
          <p className="text-sm text-gray-500 mt-1">Delay: {campaign.delayMinutes} min between submissions</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Timeline</h3>
          {campaign.startedAt && (
            <p className="text-sm text-gray-700">Started: {new Date(campaign.startedAt).toLocaleString()}</p>
          )}
          {campaign.completedAt && (
            <p className="text-sm text-gray-700">Completed: {new Date(campaign.completedAt).toLocaleString()}</p>
          )}
          {!campaign.startedAt && <p className="text-sm text-gray-400">Not started yet</p>}
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Submissions</h2>
          <p className="text-sm text-gray-500">Status of each platform submission</p>
        </div>
        {(!campaign.submissions || campaign.submissions.length === 0) ? (
          <div className="p-12 text-center">
            <p className="text-gray-400">No submissions yet</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Attempt</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {campaign.submissions.map((submission: any) => (
                <tr key={submission.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Globe size={16} className="text-gray-400" />
                      <span className="font-medium text-gray-900">{submission.platformName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <SubmissionStatusBadge status={submission.status} />
                  </td>
                  <td className="px-6 py-4">
                    {submission.resultUrl ? (
                      <a href={submission.resultUrl} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
                        View <ExternalLink size={12} />
                      </a>
                    ) : submission.error ? (
                      <span className="text-sm text-red-500 truncate max-w-xs block" title={submission.error}>
                        {submission.error.length > 60 ? submission.error.slice(0, 60) + '...' : submission.error}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {submission.lastAttempt
                      ? formatDistanceToNow(new Date(submission.lastAttempt), { addSuffix: true })
                      : '-'}
                  </td>
                  <td className="px-6 py-4">
                    {(submission.status === 'failed' || submission.status === 'captcha_needed' || submission.status === 'manual_needed') && (
                      <button
                        onClick={() => retrySubmission(submission.id)}
                        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium"
                      >
                        <RotateCcw size={14} /> Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function CampaignStatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
    queued: { color: 'bg-indigo-100 text-indigo-800', label: 'Queued' },
    running: { color: 'bg-blue-100 text-blue-800', label: 'Running' },
    paused: { color: 'bg-amber-100 text-amber-800', label: 'Paused' },
    completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
    failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
  };
  const { color, label } = config[status] || config.draft;
  return <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${color}`}>{label}</span>;
}

function SubmissionStatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string; icon: any }> = {
    pending: { color: 'bg-gray-100 text-gray-700', label: 'Pending', icon: Clock },
    queued: { color: 'bg-indigo-100 text-indigo-700', label: 'Queued', icon: Clock },
    running: { color: 'bg-blue-100 text-blue-700', label: 'Running', icon: Loader2 },
    success: { color: 'bg-green-100 text-green-700', label: 'Success', icon: CheckCircle },
    failed: { color: 'bg-red-100 text-red-700', label: 'Failed', icon: XCircle },
    captcha_needed: { color: 'bg-purple-100 text-purple-700', label: 'CAPTCHA Needed', icon: AlertTriangle },
    manual_needed: { color: 'bg-orange-100 text-orange-700', label: 'Manual Needed', icon: AlertTriangle },
  };
  const { color, label, icon: Icon } = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      <Icon size={12} className={status === 'running' ? 'animate-spin' : ''} /> {label}
    </span>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${color} mb-2`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
