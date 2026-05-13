'use client';

import { useState } from 'react';
import { Globe, Linkedin, Facebook, Instagram, Twitter, Plus, Loader2, Check, X, Clock } from 'lucide-react';
import { useProducts } from '@/lib/hooks';
import { toast } from 'sonner';

const SOCIAL_PLATFORMS = [
  { id: 'linkedin', name: 'LinkedIn Company Page', icon: Linkedin, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { id: 'facebook', name: 'Facebook Business Page', icon: Facebook, color: 'text-blue-700', bgColor: 'bg-blue-50' },
  { id: 'instagram', name: 'Instagram Business Profile', icon: Instagram, color: 'text-pink-600', bgColor: 'bg-pink-50' },
  { id: 'twitter', name: 'Twitter / X Profile', icon: Twitter, color: 'text-gray-800', bgColor: 'bg-gray-100' },
];

export default function SocialPagesPage() {
  const { data: products, isLoading } = useProducts();
  const [selectedProduct, setSelectedProduct] = useState('');
  const [creating, setCreating] = useState<string | null>(null);

  const createSocialPage = async (platform: string) => {
    if (!selectedProduct) {
      toast.error('Select a product first');
      return;
    }
    setCreating(platform);
    try {
      // This would trigger the social page creation job
      const res = await fetch('/api/social-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProduct, platform }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create');
      }
      toast.success(`${platform} page creation queued!`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setCreating(null);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-brand-600" size={32} /></div>;
  }

  // Get social pages from product data
  const selectedProductData = products?.find((p: any) => p.id === selectedProduct);
  const existingPages = selectedProductData?.socialPages || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Globe className="text-brand-600" size={28} />
          Social Pages
        </h1>
        <p className="text-gray-500 mt-1">Create and manage social media pages for your products</p>
      </div>

      {/* Product Selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Product</label>
        <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500">
          <option value="">Choose a product...</option>
          {products?.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name} - {p.url}</option>
          ))}
        </select>
        {!products?.length && (
          <p className="text-sm text-gray-400 mt-2">No products yet. Create one in the <a href="/campaigns/new" className="text-brand-600">campaign builder</a>.</p>
        )}
      </div>

      {/* Social Platforms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SOCIAL_PLATFORMS.map(platform => {
          const Icon = platform.icon;
          const existingPage = existingPages.find((p: any) => p.platform === platform.id);
          const isCreating = creating === platform.id;

          return (
            <div key={platform.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${platform.bgColor}`}>
                    <Icon className={platform.color} size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{platform.name}</h3>
                    {existingPage ? (
                      <StatusLine status={existingPage.status} url={existingPage.pageUrl} />
                    ) : (
                      <p className="text-sm text-gray-400">Not created yet</p>
                    )}
                  </div>
                </div>

                {!existingPage ? (
                  <button
                    onClick={() => createSocialPage(platform.id)}
                    disabled={!selectedProduct || isCreating}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 disabled:opacity-50"
                  >
                    {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Create
                  </button>
                ) : (
                  <PageStatus status={existingPage.status} />
                )}
              </div>

              {existingPage?.pageUrl && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <a href={existingPage.pageUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:text-brand-700 break-all">
                    {existingPage.pageUrl}
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* How it works */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-3">How Social Page Creation Works</h3>
        <ol className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2"><span className="font-medium text-brand-600 mt-0.5">1.</span> You add your personal account credentials for each platform (Account Manager)</li>
          <li className="flex items-start gap-2"><span className="font-medium text-brand-600 mt-0.5">2.</span> Click "Create" - the server launches a browser and automates the page creation</li>
          <li className="flex items-start gap-2"><span className="font-medium text-brand-600 mt-0.5">3.</span> Uses your product name, description, logo, and URL to set up the page</li>
          <li className="flex items-start gap-2"><span className="font-medium text-brand-600 mt-0.5">4.</span> If CAPTCHA or verification is needed, it pauses and notifies you</li>
        </ol>
      </div>
    </div>
  );
}

function StatusLine({ status, url }: { status: string; url?: string }) {
  const statusMap: Record<string, string> = {
    pending: 'Queued for creation',
    creating: 'Creating now...',
    created: 'Created successfully',
    verified: 'Verified & active',
    failed: 'Creation failed',
  };
  return <p className="text-sm text-gray-500">{statusMap[status] || status}</p>;
}

function PageStatus({ status }: { status: string }) {
  if (status === 'created' || status === 'verified') return <span className="flex items-center gap-1 text-green-600 text-sm font-medium"><Check size={16} /> Created</span>;
  if (status === 'creating' || status === 'pending') return <span className="flex items-center gap-1 text-amber-600 text-sm font-medium"><Clock size={16} /> Pending</span>;
  if (status === 'failed') return <span className="flex items-center gap-1 text-red-600 text-sm font-medium"><X size={16} /> Failed</span>;
  return null;
}
