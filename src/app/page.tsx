'use client';

import { useState } from 'react';
import { Rocket, Loader2, ExternalLink, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [launching, setLaunching] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin text-brand-600" size={32} /></div>;
  }

  if (!session) {
    router.push('/login');
    return null;
  }

  const handleLaunch = async () => {
    if (!url || !name || !description) {
      toast.error('Please fill in all fields');
      return;
    }

    setLaunching(true);
    setResults(null);

    try {
      const res = await fetch('/api/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, name, description }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Launch started! Submissions are being processed...');
      setResults(data);

      // Start polling for status updates
      const interval = setInterval(async () => {
        const statusRes = await fetch(`/api/launch/${data.campaignId}`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setResults((prev: any) => ({ ...prev, ...statusData }));
          // Stop polling when all done
          if (statusData.status === 'completed') {
            clearInterval(interval);
            setPollInterval(null);
          }
        }
      }, 3000);
      setPollInterval(interval);

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLaunching(false);
    }
  };

  const resetForm = () => {
    if (pollInterval) clearInterval(pollInterval);
    setPollInterval(null);
    setResults(null);
    setUrl('');
    setName('');
    setDescription('');
  };

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Rocket className="text-brand-600" size={40} />
          <h1 className="text-4xl font-bold text-gray-900">LaunchPilot</h1>
        </div>
        <p className="text-lg text-gray-500">
          Paste your link, describe your tool, and we'll submit it everywhere.
        </p>
      </div>

      {/* The ONE form */}
      {!results ? (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Your Tool's URL *</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="https://mytool.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tool Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="My Awesome Tool"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 h-32 resize-none"
              placeholder="Describe what your tool does in 2-3 sentences. This will be used across all platforms."
            />
            <p className="text-xs text-gray-400 mt-1">We'll auto-generate taglines, posts, and descriptions for each platform from this.</p>
          </div>

          <button
            onClick={handleLaunch}
            disabled={launching || !url || !name || !description}
            className="w-full py-4 bg-brand-600 text-white text-lg font-semibold rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {launching ? (
              <><Loader2 size={22} className="animate-spin" /> Launching...</>
            ) : (
              <><Rocket size={22} /> Launch to 20+ Platforms</>
            )}
          </button>

          <p className="text-center text-sm text-gray-400">
            Submits to Product Hunt, BetaList, Indie Hackers, SaaSHub, Hacker News, Reddit, and 15+ more directories automatically.
          </p>
        </div>
      ) : (
        /* Results / Progress View */
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{name}</h2>
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 flex items-center gap-1">
                  {url} <ExternalLink size={12} />
                </a>
              </div>
              <CampaignStatusBadge status={results.status || 'running'} />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <MiniStat label="Total" value={results.submissions?.length || 0} />
              <MiniStat label="Success" value={results.submissions?.filter((s: any) => s.status === 'success').length || 0} color="green" />
              <MiniStat label="Pending" value={results.submissions?.filter((s: any) => ['pending', 'queued', 'running'].includes(s.status)).length || 0} color="blue" />
              <MiniStat label="Issues" value={results.submissions?.filter((s: any) => ['failed', 'captcha_needed', 'manual_needed'].includes(s.status)).length || 0} color="red" />
            </div>

            {/* Submission List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.submissions?.map((sub: any) => (
                <div key={sub.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    <SubmissionIcon status={sub.status} />
                    <span className="text-sm font-medium text-gray-800">{sub.platformName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {sub.resultUrl && (
                      <a href={sub.resultUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline">
                        View
                      </a>
                    )}
                    <SubmissionStatusText status={sub.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={resetForm} className="w-full py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium">
            Launch Another Tool
          </button>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color?: string }) {
  const colors: Record<string, string> = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    red: 'text-red-600',
  };
  return (
    <div className="text-center p-2 bg-gray-50 rounded-lg">
      <p className={`text-2xl font-bold ${colors[color || ''] || 'text-gray-900'}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function SubmissionIcon({ status }: { status: string }) {
  if (status === 'success') return <CheckCircle size={16} className="text-green-500" />;
  if (status === 'failed') return <XCircle size={16} className="text-red-500" />;
  if (status === 'captcha_needed' || status === 'manual_needed') return <AlertCircle size={16} className="text-amber-500" />;
  if (status === 'running') return <Loader2 size={16} className="text-blue-500 animate-spin" />;
  return <Clock size={16} className="text-gray-400" />;
}

function SubmissionStatusText({ status }: { status: string }) {
  const map: Record<string, { text: string; color: string }> = {
    pending: { text: 'Queued', color: 'text-gray-400' },
    queued: { text: 'Queued', color: 'text-gray-400' },
    running: { text: 'Submitting...', color: 'text-blue-600' },
    success: { text: 'Done', color: 'text-green-600' },
    failed: { text: 'Failed', color: 'text-red-600' },
    captcha_needed: { text: 'CAPTCHA', color: 'text-amber-600' },
    manual_needed: { text: 'Manual', color: 'text-amber-600' },
  };
  const { text, color } = map[status] || { text: status, color: 'text-gray-500' };
  return <span className={`text-xs font-medium ${color}`}>{text}</span>;
}

function CampaignStatusBadge({ status }: { status: string }) {
  const map: Record<string, { text: string; color: string }> = {
    running: { text: 'Running', color: 'bg-blue-100 text-blue-800' },
    completed: { text: 'Complete', color: 'bg-green-100 text-green-800' },
    failed: { text: 'Failed', color: 'bg-red-100 text-red-800' },
  };
  const { text, color } = map[status] || { text: 'In Progress', color: 'bg-blue-100 text-blue-800' };
  return <span className={`px-3 py-1 rounded-full text-xs font-medium ${color}`}>{text}</span>;
}
