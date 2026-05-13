'use client';

import { useState, useEffect } from 'react';
import { Rocket, CheckCircle, XCircle, AlertCircle, Clock, Loader2, ExternalLink, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Launch {
  id: string;
  name: string;
  status: string;
  product: { name: string; url: string };
  startedAt: string | null;
  completedAt: string | null;
  submissions: {
    id: string;
    platform: string;
    platformName: string;
    status: string;
    resultUrl: string | null;
    error: string | null;
  }[];
  stats: {
    total: number;
    success: number;
    failed: number;
    pending: number;
    manual: number;
  };
}

export default function LaunchesPage() {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLaunches = async () => {
    try {
      const res = await fetch('/api/campaigns');
      if (res.ok) {
        const data = await res.json();
        setLaunches(data);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLaunches();
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchLaunches, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin text-brand-600" size={32} /></div>;
  }

  if (launches.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <Rocket className="mx-auto mb-4 text-gray-300" size={48} />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">No launches yet</h2>
        <p className="text-gray-400 mb-6">Go to the home page and submit your tool to get started.</p>
        <a href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium">
          <Rocket size={18} /> Launch a Tool
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Launches</h1>
          <p className="text-gray-500 text-sm">Track the status of all your submissions</p>
        </div>
        <a href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium text-sm">
          <Rocket size={16} /> New Launch
        </a>
      </div>

      <div className="space-y-4">
        {launches.map((launch) => {
          const isExpanded = expandedId === launch.id;
          const stats = launch.stats || {
            total: launch.submissions?.length || 0,
            success: launch.submissions?.filter(s => s.status === 'success').length || 0,
            failed: launch.submissions?.filter(s => s.status === 'failed').length || 0,
            pending: launch.submissions?.filter(s => ['pending', 'queued', 'running'].includes(s.status)).length || 0,
            manual: launch.submissions?.filter(s => ['captcha_needed', 'manual_needed'].includes(s.status)).length || 0,
          };

          return (
            <div key={launch.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Header - clickable */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : launch.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <StatusIcon status={launch.status} />
                  <div>
                    <h3 className="font-semibold text-gray-900">{launch.product?.name || launch.name}</h3>
                    <p className="text-sm text-gray-400">
                      {launch.startedAt ? formatDistanceToNow(new Date(launch.startedAt), { addSuffix: true }) : 'Not started'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-green-600 font-medium">{stats.success}/{stats.total}</span>
                    {stats.failed > 0 && <span className="text-red-500">{stats.failed} failed</span>}
                    {stats.pending > 0 && <span className="text-blue-500">{stats.pending} pending</span>}
                  </div>
                  <LaunchStatusBadge status={launch.status} />
                </div>
              </button>

              {/* Expanded - submission details */}
              {isExpanded && launch.submissions && (
                <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
                  <div className="space-y-2">
                    {launch.submissions.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg">
                        <div className="flex items-center gap-2">
                          <SmallStatusIcon status={sub.status} />
                          <span className="text-sm font-medium text-gray-700">{sub.platformName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {sub.error && <span className="text-xs text-red-500 max-w-48 truncate" title={sub.error}>{sub.error}</span>}
                          {sub.resultUrl && (
                            <a href={sub.resultUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                              View <ExternalLink size={10} />
                            </a>
                          )}
                          <SubmissionStatusLabel status={sub.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle className="text-green-600" size={20} /></div>;
  if (status === 'running' || status === 'queued') return <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><Loader2 className="text-blue-600 animate-spin" size={20} /></div>;
  if (status === 'failed') return <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"><XCircle className="text-red-600" size={20} /></div>;
  return <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><Clock className="text-gray-500" size={20} /></div>;
}

function SmallStatusIcon({ status }: { status: string }) {
  if (status === 'success') return <CheckCircle size={14} className="text-green-500" />;
  if (status === 'failed') return <XCircle size={14} className="text-red-500" />;
  if (status === 'captcha_needed' || status === 'manual_needed') return <AlertCircle size={14} className="text-amber-500" />;
  if (status === 'running') return <Loader2 size={14} className="text-blue-500 animate-spin" />;
  return <Clock size={14} className="text-gray-400" />;
}

function LaunchStatusBadge({ status }: { status: string }) {
  const map: Record<string, { text: string; color: string }> = {
    draft: { text: 'Draft', color: 'bg-gray-100 text-gray-700' },
    queued: { text: 'Starting', color: 'bg-indigo-100 text-indigo-700' },
    running: { text: 'Running', color: 'bg-blue-100 text-blue-700' },
    completed: { text: 'Done', color: 'bg-green-100 text-green-700' },
    failed: { text: 'Failed', color: 'bg-red-100 text-red-700' },
  };
  const { text, color } = map[status] || { text: status, color: 'bg-gray-100 text-gray-700' };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>{text}</span>;
}

function SubmissionStatusLabel({ status }: { status: string }) {
  const map: Record<string, { text: string; color: string }> = {
    pending: { text: 'Queued', color: 'text-gray-400' },
    queued: { text: 'Queued', color: 'text-gray-400' },
    running: { text: 'Submitting', color: 'text-blue-600' },
    success: { text: 'Submitted', color: 'text-green-600' },
    failed: { text: 'Failed', color: 'text-red-600' },
    captcha_needed: { text: 'CAPTCHA', color: 'text-amber-600' },
    manual_needed: { text: 'Manual', color: 'text-amber-600' },
  };
  const { text, color } = map[status] || { text: status, color: 'text-gray-500' };
  return <span className={`text-xs font-medium ${color}`}>{text}</span>;
}
