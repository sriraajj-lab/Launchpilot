'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Play, CheckCircle, XCircle, Clock, AlertTriangle,
  Loader2, ExternalLink, RotateCcw, Globe, Zap, Shield, LogIn,
  Bell, BellRing, MousePointerClick, CheckCheck, X as XIcon,
  Monitor, Maximize2, Minimize2, ArrowRight, ArrowRightLeft,
} from 'lucide-react';
import { useCampaign } from '@/lib/hooks';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

// VNC URL - the worker's noVNC endpoint
const VNC_URL = process.env.NEXT_PUBLIC_VNC_URL || '';

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params.id as string;
  const { data: campaign, isLoading, mutate } = useCampaign(campaignId);

  // VNC panel state
  const [showVnc, setShowVnc] = useState(false);
  const [vncFullscreen, setVncFullscreen] = useState(false);
  const [activeActionSubmission, setActiveActionSubmission] = useState<any>(null);

  // Track which submissions need action
  const [actionAlerts, setActionAlerts] = useState<any[]>([]);
  const [previousActionIds, setPreviousActionIds] = useState<Set<string>>(new Set());

  // Detect submissions that need action
  useEffect(() => {
    if (!campaign?.submissions) return;

    const actionSubs = campaign.submissions.filter(
      (s: any) => ['captcha_needed', 'manual_needed'].includes(s.status)
    );

    const currentActionIds = new Set<string>(actionSubs.map((s: any) => s.id));

    // Show toast for newly blocked submissions
    const newAlerts = actionSubs.filter(
      (s: any) => !previousActionIds.has(s.id)
    );

    if (newAlerts.length > 0 && previousActionIds.size > 0) {
      newAlerts.forEach((s: any) => {
        const actionLabel = getActionLabel(s.actionType);
        toast.warning(`${s.platformName}: ${actionLabel} needed!`, {
          duration: 8000,
        });
        // Auto-open VNC panel when action is needed
        setShowVnc(true);
        setActiveActionSubmission(s);
      });
    }

    setActionAlerts(actionSubs);

    // Auto-select first action submission if none selected
    if (actionSubs.length > 0 && !activeActionSubmission) {
      setActiveActionSubmission(actionSubs[0]);
      setShowVnc(true);
    }

    // If all actions resolved, close VNC
    if (actionSubs.length === 0 && showVnc) {
      setShowVnc(false);
      setActiveActionSubmission(null);
    }

    setPreviousActionIds(currentActionIds);
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

  const signalContinue = async (submissionId: string) => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/submissions/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'continue' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Signal sent! The worker will continue automation now.');
      mutate();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const markSubmissionDone = async (submissionId: string, action: string, resultUrl?: string) => {
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
      } else if (action === 'mark_failed') {
        toast.success('Marked as failed');
      } else if (action === 'retry_after_action') {
        toast.success('Submission queued for retry');
      }
      mutate();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleActionClick = (submission: any) => {
    setActiveActionSubmission(submission);
    setShowVnc(true);
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
    <div className={`flex h-[calc(100vh-4rem)] overflow-hidden`}>
      {/* LEFT PANEL - Campaign Details */}
      <div className={`flex-1 overflow-y-auto ${showVnc && !vncFullscreen ? '' : ''}`}
        style={{ minWidth: showVnc ? '400px' : undefined }}>

        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/campaigns" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
                <p className="text-gray-500 mt-0.5">
                  {campaign.product?.name} · Created {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true })}
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

          {/* Action Alert Banner */}
          {actionAlerts.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <BellRing size={20} className="text-amber-600 animate-pulse" />
                <h3 className="text-lg font-bold text-amber-800">
                  {actionAlerts.length} Platform{actionAlerts.length > 1 ? 's' : ''} Need Your Attention
                </h3>
              </div>
              <p className="text-sm text-amber-700 mb-3">
                Click on a platform below to open the browser panel. Complete the required action in the browser, then click <strong>&quot;I&apos;m Done, Continue&quot;</strong> to let the automation resume.
              </p>
              <div className="space-y-2">
                {actionAlerts.map((sub: any) => (
                  <div
                    key={sub.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      activeActionSubmission?.id === sub.id
                        ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-400'
                        : 'bg-white border-amber-200 hover:bg-amber-50'
                    }`}
                    onClick={() => handleActionClick(sub)}
                  >
                    <div className="flex items-center gap-3">
                      <ActionTypeBadge actionType={sub.actionType} />
                      <span className="font-semibold text-gray-900">{sub.platformName}</span>
                      {activeActionSubmission?.id === sub.id && (
                        <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">Active</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{getActionLabel(sub.actionType)}</span>
                      <ArrowRight size={14} className="text-amber-600" />
                    </div>
                  </div>
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

          {/* Submissions Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Submissions</h2>
              <p className="text-sm text-gray-500">Click on platforms needing action to open the browser</p>
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {campaign.submissions.map((submission: any) => (
                      <tr
                        key={submission.id}
                        className={`hover:bg-gray-50 cursor-pointer ${
                          ['captcha_needed', 'manual_needed'].includes(submission.status) ? 'bg-amber-50/50' : ''
                        } ${activeActionSubmission?.id === submission.id ? 'ring-2 ring-inset ring-amber-400 bg-amber-50' : ''}`}
                        onClick={() => {
                          if (['captcha_needed', 'manual_needed'].includes(submission.status)) {
                            handleActionClick(submission);
                          }
                        }}
                      >
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
                              className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}>
                              View <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <SubmissionActions
                            submission={submission}
                            isActive={activeActionSubmission?.id === submission.id}
                            onRetry={() => retrySubmission(submission.id)}
                            onOpenInVnc={() => handleActionClick(submission)}
                            onContinue={() => signalContinue(submission.id)}
                            onMarkDone={() => markSubmissionDone(submission.id, 'mark_done')}
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
      </div>

      {/* RIGHT PANEL - VNC Browser Viewer */}
      {showVnc && (
        <div className={`border-l border-gray-200 bg-gray-900 flex flex-col ${
          vncFullscreen ? 'fixed inset-0 z-50' : 'w-[55%] min-w-[500px]'
        }`}>
          {/* VNC Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <Monitor size={18} className="text-blue-400" />
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {activeActionSubmission
                    ? `${activeActionSubmission.platformName} - Browser`
                    : 'Worker Browser'}
                </h3>
                {activeActionSubmission && (
                  <p className="text-xs text-gray-400">
                    {getActionInstructions(activeActionSubmission.actionType, activeActionSubmission.platformName)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setVncFullscreen(!vncFullscreen)}
                className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-700 transition-colors"
                title={vncFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {vncFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                onClick={() => { setShowVnc(false); setVncFullscreen(false); }}
                className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-700 transition-colors"
                title="Close browser panel"
              >
                <XIcon size={16} />
              </button>
            </div>
          </div>

          {/* VNC iframe */}
          <div className="flex-1 relative">
            {VNC_URL ? (
              <iframe
                src={`${VNC_URL}/vnc.html?autoconnect=true&resize=scale`}
                className="w-full h-full border-0"
                title="Worker Browser"
                allow="clipboard-read; clipboard-write"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Monitor size={48} className="mb-4 text-gray-600" />
                <p className="text-lg font-medium text-gray-300 mb-2">Browser Panel</p>
                <p className="text-sm text-gray-500 text-center max-w-md px-4">
                  The embedded browser will appear here when the worker is running.
                  Make sure the worker is deployed with VNC support.
                </p>
                <p className="text-xs text-gray-600 mt-4">
                  NEXT_PUBLIC_VNC_URL is not configured
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons Bar */}
          {activeActionSubmission && (
            <div className="px-4 py-3 bg-gray-800 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ActionTypeBadge actionType={activeActionSubmission.actionType} dark />
                  <span className="text-sm text-gray-300">
                    {activeActionSubmission.platformName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => markSubmissionDone(activeActionSubmission.id, 'mark_failed')}
                    className="px-3 py-2 text-gray-400 hover:text-red-400 text-sm rounded-lg hover:bg-gray-700 transition-colors"
                    title="Skip this platform"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => markSubmissionDone(activeActionSubmission.id, 'mark_done')}
                    className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-500 transition-colors font-medium"
                  >
                    <MousePointerClick size={14} className="inline mr-1.5" />
                    Mark Done
                  </button>
                  <button
                    onClick={() => signalContinue(activeActionSubmission.id)}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-500 transition-colors font-medium shadow-lg"
                  >
                    <CheckCheck size={14} className="inline mr-1.5" />
                    I&apos;m Done, Continue
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// === Helper Functions ===

function getActionLabel(actionType: string | null): string {
  switch (actionType) {
    case 'captcha': return 'CAPTCHA';
    case 'login': return 'Login Required';
    case 'security_challenge': return 'Security Check';
    case 'manual_submit': return 'Manual Submit';
    case 'payment': return 'Payment Required';
    default: return 'Action Needed';
  }
}

function getActionInstructions(actionType: string | null, platformName: string): string {
  switch (actionType) {
    case 'captcha': return `Solve the CAPTCHA on ${platformName}, then click "I'm Done, Continue"`;
    case 'login': return `Log in to ${platformName}, then click "I'm Done, Continue"`;
    case 'security_challenge': return `Pass the security check on ${platformName}, then click "I'm Done, Continue"`;
    case 'manual_submit': return `Fill and submit the form on ${platformName}, then click "I'm Done, Continue"`;
    default: return `Complete the action on ${platformName}, then click "I'm Done, Continue"`;
  }
}

// === Sub-components ===

function SubmissionActions({ submission, isActive, onRetry, onOpenInVnc, onContinue, onMarkDone, onMarkFailed }: {
  submission: any;
  isActive: boolean;
  onRetry: () => void;
  onOpenInVnc: () => void;
  onContinue: () => void;
  onMarkDone: () => void;
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
        <button
          onClick={onOpenInVnc}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-colors text-xs font-medium ${
            isActive
              ? 'bg-blue-600 text-white ring-2 ring-blue-300'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <Monitor size={12} /> {isActive ? 'Viewing' : 'Open in Browser'}
        </button>
        <button
          onClick={onContinue}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs font-medium"
          title="I completed the required action - continue automation"
        >
          <CheckCheck size={12} /> Done, Continue
        </button>
        <button
          onClick={onMarkDone}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-xs font-medium"
          title="I submitted manually"
        >
          <MousePointerClick size={12} /> Mark Done
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

function ActionTypeBadge({ actionType, dark }: { actionType: string | null; dark?: boolean }) {
  if (!actionType) return null;

  const config: Record<string, { color: string; label: string; icon: any; darkColor?: string }> = {
    captcha: { color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'CAPTCHA', icon: Shield, darkColor: 'bg-purple-900/50 text-purple-300 border-purple-700' },
    login: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Login Required', icon: LogIn, darkColor: 'bg-blue-900/50 text-blue-300 border-blue-700' },
    manual_submit: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Manual Submit', icon: MousePointerClick, darkColor: 'bg-orange-900/50 text-orange-300 border-orange-700' },
    payment: { color: 'bg-pink-100 text-pink-700 border-pink-200', label: 'Payment Required', icon: Zap, darkColor: 'bg-pink-900/50 text-pink-300 border-pink-700' },
    security_challenge: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Security Check', icon: Shield, darkColor: 'bg-red-900/50 text-red-300 border-red-700' },
  };

  const entry = config[actionType] || { color: 'bg-gray-100 text-gray-700 border-gray-200', label: actionType, icon: AlertTriangle, darkColor: 'bg-gray-900/50 text-gray-300 border-gray-700' };
  const colorClass = dark ? (entry.darkColor || entry.color) : entry.color;
  const { label, icon: Icon } = entry;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
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
