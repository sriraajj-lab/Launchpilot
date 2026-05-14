'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Play, CheckCircle, XCircle, Clock, AlertTriangle,
  Loader2, ExternalLink, RotateCcw, Globe, Zap, Shield, LogIn,
  Bell, BellRing, MousePointerClick, CheckCheck, X as XIcon,
} from 'lucide-react';
import { useCampaign } from '@/lib/hooks';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params.id as string;
  const { data: campaign, isLoading, mutate } = useCampaign(campaignId);
  const [actionAlerts, setActionAlerts] = useState<any[]>([]);
  const [previousPending, setPreviousPending] = useState<Set<string>>(new Set());
  const [showAlerts, setShowAlerts] = useState(true);

  // Track new action-required submissions and show alerts
  useEffect(() => {
    if (!campaign?.submissions) return;

    const currentActionSubs = campaign.submissions.filter(
      (s: any) => ['captcha_needed', 'manual_needed'].includes(s.status)
    );

    const currentActionIds = new Set(currentActionSubs.map((s: any) => s.id));

    // Find newly action-required submissions (weren't in previous poll)
    const newAlerts = currentActionSubs.filter(
      (s: any) => !previousPending.has(s.id)
    );

    if (newAlerts.length > 0 && previousPending.size > 0) {
      // Show toast notifications for each new alert
      newAlerts.forEach((s: any) => {
        const actionLabel = s.actionType === 'captcha' ? 'CAPTCHA' :
                           s.actionType === 'login' ? 'Login Required' :
                           s.actionType === 'security_challenge' ? 'Security Check' :
                           'Manual Action';
        toast.warning(`${s.platformName}: ${actionLabel} needed!`, {
          duration: 8000,
          action: {
            label: 'Open',
            onClick: () => {
              if (s.actionUrl) window.open(s.actionUrl, '_blank');
            },
          },
        });
      });
    }

    setActionAlerts(currentActionSubs);
    setPreviousPending(currentActionIds);
  }, [campaign?.submissions]);

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

  const markSubmissionDone = async (submissionId: string, action: 'mark_done' | 'mark_failed' | 'retry_after_action', resultUrl?: string) => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/submissions/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, resultUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (action === 'mark_done') {
        toast.success('Marked as completed!');
      } else if (action === 'retry_after_action') {
        toast.success('Worker will retry the submission now. Complete the CAPTCHA/login in the opened tab first!');
      } else {
        toast.success('Marked as failed');
      }
      mutate();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openPlatformAndRetry = async (submission: any) => {
    // Open the platform URL in a new tab for the user
    if (submission.actionUrl) {
      window.open(submission.actionUrl, '_blank');
    }
    // Tell the user to come back after they complete the action
    toast.info(`Complete the action on ${submission.platformName}, then click "Done, Continue" when you're ready for the worker to retry.`, {
      duration: 10000,
    });
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

      {/* Action Alerts Banner */}
      {actionAlerts.length > 0 && showAlerts && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BellRing size={20} className="text-amber-600 animate-pulse" />
              <h3 className="text-lg font-bold text-amber-800">
                {actionAlerts.length} Platform{actionAlerts.length > 1 ? 's' : ''} Need Your Attention
              </h3>
            </div>
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="text-amber-600 hover:text-amber-800"
            >
              {showAlerts ? <XIcon size={18} /> : <Bell size={18} />}
            </button>
          </div>
          <div className="space-y-2">
            {actionAlerts.map((sub: any) => (
              <ActionAlertCard
                key={sub.id}
                submission={sub}
                onOpenPlatform={openPlatformAndRetry}
                onMarkDone={(resultUrl) => markSubmissionDone(sub.id, 'mark_done', resultUrl)}
                onRetryAfterAction={() => markSubmissionDone(sub.id, 'retry_after_action')}
                onMarkFailed={() => markSubmissionDone(sub.id, 'mark_failed')}
              />
            ))}
          </div>
        </div>
      )}

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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">What&apos;s Needed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Attempt</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {campaign.submissions.map((submission: any) => (
                  <tr key={submission.id} className={`hover:bg-gray-50 ${['captcha_needed', 'manual_needed'].includes(submission.status) ? 'bg-amber-50/50' : ''}`}>
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
                      {['captcha_needed', 'manual_needed'].includes(submission.status) ? (
                        <div className="max-w-xs">
                          <ActionTypeBadge actionType={submission.actionType} />
                          {submission.error && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2" title={submission.error}>
                              {submission.error}
                            </p>
                          )}
                        </div>
                      ) : submission.error ? (
                        <span className="text-sm text-red-500 truncate max-w-xs block" title={submission.error}>
                          {submission.error.length > 60 ? submission.error.slice(0, 60) + '...' : submission.error}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {submission.resultUrl ? (
                        <a href={submission.resultUrl} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
                          View <ExternalLink size={12} />
                        </a>
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
                      <SubmissionActions
                        submission={submission}
                        onRetry={() => retrySubmission(submission.id)}
                        onOpenPlatform={() => openPlatformAndRetry(submission)}
                        onMarkDone={(resultUrl) => markSubmissionDone(submission.id, 'mark_done', resultUrl)}
                        onRetryAfterAction={() => markSubmissionDone(submission.id, 'retry_after_action')}
                        onMarkFailed={() => markSubmissionDone(submission.id, 'mark_failed')}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// === Action Alert Card (shown at top when submissions need attention) ===

function ActionAlertCard({ submission, onOpenPlatform, onMarkDone, onRetryAfterAction, onMarkFailed }: {
  submission: any;
  onOpenPlatform: (sub: any) => void;
  onMarkDone: (resultUrl?: string) => void;
  onRetryAfterAction: () => void;
  onMarkFailed: () => void;
}) {
  const getActionInstructions = (actionType: string | null, platformName: string) => {
    switch (actionType) {
      case 'captcha':
        return `1. Click "Open Platform" to open ${platformName}\n2. Solve the CAPTCHA challenge\n3. Come back and click "Done, Continue" to let the worker retry, or "Mark Done" if you submitted manually`;
      case 'login':
        return `1. Click "Open Platform" to go to ${platformName}\n2. Log in to your account\n3. Come back and click "Done, Continue" so the worker can retry with your session`;
      case 'security_challenge':
        return `1. Click "Open Platform" to open ${platformName}\n2. Pass the security verification (Cloudflare, etc.)\n3. Come back and click "Done, Continue" to retry`;
      case 'manual_submit':
        return `1. Click "Open Platform" to open ${platformName}'s submission page\n2. Fill in and submit the form manually\n3. Click "Mark Done" when finished`;
      default:
        return `1. Click "Open Platform" to open the site\n2. Complete the required action\n3. Come back and click "Done, Continue" or "Mark Done"`;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-amber-200 p-3 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <ActionTypeBadge actionType={submission.actionType} />
            <span className="font-semibold text-gray-900">{submission.platformName}</span>
          </div>
          <p className="text-sm text-gray-600 whitespace-pre-line">
            {getActionInstructions(submission.actionType, submission.platformName)}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-4 shrink-0">
          {submission.actionUrl && (
            <button
              onClick={() => onOpenPlatform(submission)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
            >
              <ExternalLink size={14} /> Open Platform
            </button>
          )}
          <button
            onClick={onRetryAfterAction}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm"
            title="I completed the action - retry the automated submission"
          >
            <CheckCheck size={14} /> Done, Continue
          </button>
          <button
            onClick={() => onMarkDone()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
            title="I submitted manually - mark as done"
          >
            <MousePointerClick size={14} /> Mark Done
          </button>
        </div>
      </div>
    </div>
  );
}

// === Submission Actions (per-row in the table) ===

function SubmissionActions({ submission, onRetry, onOpenPlatform, onMarkDone, onRetryAfterAction, onMarkFailed }: {
  submission: any;
  onRetry: () => void;
  onOpenPlatform: () => void;
  onMarkDone: (resultUrl?: string) => void;
  onRetryAfterAction: () => void;
  onMarkFailed: () => void;
}) {
  const status = submission.status;

  if (status === 'success') {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-green-600">
        <CheckCircle size={14} /> Done
      </span>
    );
  }

  if (status === 'running') {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-blue-600">
        <Loader2 size={14} className="animate-spin" /> Processing...
      </span>
    );
  }

  if (['pending', 'queued'].includes(status)) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-gray-500">
        <Clock size={14} /> Waiting...
      </span>
    );
  }

  if (['captcha_needed', 'manual_needed'].includes(status)) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {submission.actionUrl && (
          <button
            onClick={onOpenPlatform}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
          >
            <ExternalLink size={12} /> Open
          </button>
        )}
        <button
          onClick={onRetryAfterAction}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs font-medium"
          title="I completed the required action - retry now"
        >
          <CheckCheck size={12} /> Done, Retry
        </button>
        <button
          onClick={() => onMarkDone()}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-xs font-medium"
          title="I submitted manually"
        >
          <MousePointerClick size={12} /> Mark Done
        </button>
        <button
          onClick={onMarkFailed}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-gray-400 hover:text-red-500 transition-colors text-xs"
          title="Skip this platform"
        >
          <XIcon size={12} />
        </button>
      </div>
    );
  }

  // Failed
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium"
      >
        <RotateCcw size={14} /> Retry
      </button>
    </div>
  );
}

// === Sub-components ===

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
    captcha_needed: { color: 'bg-purple-100 text-purple-700', label: 'CAPTCHA Needed', icon: Shield },
    manual_needed: { color: 'bg-orange-100 text-orange-700', label: 'Action Needed', icon: AlertTriangle },
  };
  const { color, label, icon: Icon } = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      <Icon size={12} className={status === 'running' ? 'animate-spin' : ''} /> {label}
    </span>
  );
}

function ActionTypeBadge({ actionType }: { actionType: string | null }) {
  if (!actionType) return null;

  const config: Record<string, { color: string; label: string; icon: any }> = {
    captcha: { color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'CAPTCHA', icon: Shield },
    login: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Login Required', icon: LogIn },
    manual_submit: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Manual Submit', icon: MousePointerClick },
    payment: { color: 'bg-pink-100 text-pink-700 border-pink-200', label: 'Payment Required', icon: Zap },
    security_challenge: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Security Check', icon: Shield },
  };

  const { color, label, icon: Icon } = config[actionType] || { color: 'bg-gray-100 text-gray-700 border-gray-200', label: actionType, icon: AlertTriangle };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      <Icon size={10} /> {label}
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
