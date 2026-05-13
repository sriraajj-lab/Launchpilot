'use client';

import { useState } from 'react';
import { Zap, Check, X, AlertCircle, Loader2 } from 'lucide-react';
import { useProducts } from '@/lib/hooks';
import { toast } from 'sonner';

const QUICK_PLATFORMS = [
  { id: 'betalist', name: 'BetaList' },
  { id: 'startup_base', name: 'StartupBase' },
  { id: 'launching_next', name: 'Launching Next' },
  { id: 'saashub', name: 'SaaSHub' },
  { id: 'microlaunch', name: 'MicroLaunch' },
  { id: 'uneed', name: 'Uneed' },
  { id: 'devhunt', name: 'DevHunt' },
  { id: 'pitchwall', name: 'PitchWall' },
  { id: 'toolify', name: 'Toolify.ai' },
  { id: 'there_is_an_ai', name: 'There Is An AI For That' },
  { id: 'futurepedia', name: 'Futurepedia' },
  { id: 'stackshare', name: 'StackShare' },
  { id: 'startup_ranking', name: 'StartupRanking' },
  { id: 'alternativeto', name: 'AlternativeTo' },
];

export default function QuickSubmitPage() {
  const { data: products } = useProducts();
  const [selectedProduct, setSelectedProduct] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const startQuickSubmit = async () => {
    if (!selectedProduct) {
      toast.error('Select a product first');
      return;
    }
    setIsRunning(true);
    try {
      // Create a campaign with all quick platforms
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct,
          name: 'Quick Submit - All Directories',
          targetPlatforms: QUICK_PLATFORMS.map(p => p.id),
          delayMinutes: 3,
        }),
      });
      const campaign = await res.json();
      if (!res.ok) throw new Error(campaign.error);

      // Launch it
      const launchRes = await fetch(`/api/campaigns/${campaign.id}/launch`, { method: 'POST' });
      if (!launchRes.ok) {
        const d = await launchRes.json();
        throw new Error(d.error);
      }

      toast.success('Quick submit launched! Check Campaigns page for progress.');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsRunning(false);
    }
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
      </div>

      {/* Product Selector + Launch */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-end gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Product to submit</label>
          <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500">
            <option value="">Select a product...</option>
            {products?.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <button onClick={startQuickSubmit} disabled={isRunning || !selectedProduct}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium whitespace-nowrap">
          {isRunning ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
          {isRunning ? 'Launching...' : 'Submit to All'}
        </button>
      </div>

      {/* Platform List */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        <div className="px-6 py-3 bg-gray-50 rounded-t-xl">
          <p className="text-sm font-medium text-gray-600">{QUICK_PLATFORMS.length} Fully Automated Platforms</p>
        </div>
        {QUICK_PLATFORMS.map(platform => (
          <div key={platform.id} className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-900">{platform.name}</span>
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Full Auto</span>
            </div>
            <Check size={16} className="text-gray-300" />
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <strong>How it works:</strong> Clicking "Submit to All" creates a campaign targeting all {QUICK_PLATFORMS.length} directories above. 
        The server worker processes them sequentially with random delays (3-5 min apart) to look natural. 
        Check the Campaigns page to monitor progress in real-time.
      </div>
    </div>
  );
}
