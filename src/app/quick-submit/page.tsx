'use client';

import { useState } from 'react';
import { Zap, Check, X, AlertCircle, Loader2 } from 'lucide-react';

const QUICK_PLATFORMS = [
  { id: 'betalist', name: 'BetaList', auto: true },
  { id: 'startup_base', name: 'StartupBase', auto: true },
  { id: 'launching_next', name: 'Launching Next', auto: true },
  { id: 'saashub', name: 'SaaSHub', auto: true },
  { id: 'microlaunch', name: 'MicroLaunch', auto: true },
  { id: 'uneed', name: 'Uneed', auto: true },
  { id: 'devhunt', name: 'DevHunt', auto: true },
  { id: 'pitchwall', name: 'PitchWall', auto: true },
  { id: 'toolify', name: 'Toolify.ai', auto: true },
  { id: 'there_is_an_ai', name: 'There Is An AI For That', auto: true },
  { id: 'futurepedia', name: 'Futurepedia', auto: true },
  { id: 'stackshare', name: 'StackShare', auto: true },
  { id: 'startup_ranking', name: 'StartupRanking', auto: true },
  { id: 'alternativeto', name: 'AlternativeTo', auto: true },
];

export default function QuickSubmitPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<Record<string, 'pending' | 'running' | 'success' | 'failed' | 'captcha'>>({});

  const startQuickSubmit = () => {
    setIsRunning(true);
    // Simulate submissions
    QUICK_PLATFORMS.forEach((platform, i) => {
      setTimeout(() => {
        setResults(prev => ({ ...prev, [platform.id]: 'running' }));
        setTimeout(() => {
          const outcomes: ('success' | 'failed' | 'captcha')[] = ['success', 'success', 'success', 'success', 'captcha', 'failed'];
          const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
          setResults(prev => ({ ...prev, [platform.id]: outcome }));
          if (i === QUICK_PLATFORMS.length - 1) setIsRunning(false);
        }, 2000 + Math.random() * 3000);
      }, i * 3000);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="text-amber-500" size={28} />
            Quick Submit
          </h1>
          <p className="text-gray-500 mt-1">Submit to all fully-automated directories in one click</p>
        </div>
        <button
          onClick={startQuickSubmit}
          disabled={isRunning}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium"
        >
          {isRunning ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
          {isRunning ? 'Submitting...' : 'Submit to All'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {QUICK_PLATFORMS.map(platform => (
          <div key={platform.id} className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-900">{platform.name}</span>
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Full Auto</span>
            </div>
            <StatusIcon status={results[platform.id]} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status?: string }) {
  if (!status) return <span className="text-xs text-gray-400">Waiting</span>;
  if (status === 'running') return <Loader2 size={18} className="text-blue-500 animate-spin" />;
  if (status === 'success') return <Check size={18} className="text-green-500" />;
  if (status === 'failed') return <X size={18} className="text-red-500" />;
  if (status === 'captcha') return <AlertCircle size={18} className="text-amber-500" />;
  return null;
}
