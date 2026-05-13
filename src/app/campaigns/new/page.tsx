'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Rocket, ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useProducts } from '@/lib/hooks';

type Step = 'product' | 'platforms' | 'schedule' | 'review';
const STEPS: { id: Step; label: string }[] = [
  { id: 'product', label: 'Product Details' },
  { id: 'platforms', label: 'Select Platforms' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'review', label: 'Review & Launch' },
];

const PLATFORM_OPTIONS = [
  { id: 'product_hunt', name: 'Product Hunt', category: 'directory', auto: 'semi' },
  { id: 'betalist', name: 'BetaList', category: 'directory', auto: 'full' },
  { id: 'indie_hackers', name: 'Indie Hackers', category: 'directory', auto: 'semi' },
  { id: 'alternativeto', name: 'AlternativeTo', category: 'directory', auto: 'full' },
  { id: 'saashub', name: 'SaaSHub', category: 'directory', auto: 'full' },
  { id: 'g2', name: 'G2', category: 'review', auto: 'semi' },
  { id: 'capterra', name: 'Capterra', category: 'review', auto: 'semi' },
  { id: 'crunchbase', name: 'Crunchbase', category: 'listing', auto: 'semi' },
  { id: 'angellist', name: 'AngelList', category: 'listing', auto: 'semi' },
  { id: 'startup_base', name: 'StartupBase', category: 'listing', auto: 'full' },
  { id: 'launching_next', name: 'Launching Next', category: 'listing', auto: 'full' },
  { id: 'hackernews', name: 'Hacker News', category: 'social', auto: 'semi' },
  { id: 'reddit', name: 'Reddit', category: 'social', auto: 'manual' },
  { id: 'twitter', name: 'Twitter / X', category: 'social', auto: 'semi' },
  { id: 'linkedin_post', name: 'LinkedIn Post', category: 'social', auto: 'manual' },
  { id: 'toolify', name: 'Toolify.ai', category: 'seo', auto: 'full' },
  { id: 'microlaunch', name: 'MicroLaunch', category: 'directory', auto: 'full' },
  { id: 'devhunt', name: 'DevHunt', category: 'directory', auto: 'full' },
  { id: 'uneed', name: 'Uneed', category: 'directory', auto: 'full' },
  { id: 'stackshare', name: 'StackShare', category: 'listing', auto: 'full' },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const { data: products } = useProducts();
  const [currentStep, setCurrentStep] = useState<Step>('product');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    productName: '', tagline: '', description: '', url: '', category: '', keywords: '', pricing: 'free',
    selectedPlatforms: [] as string[],
    createSocialPages: true,
    startImmediately: true, scheduledDate: '', delayMinutes: 5,
    subreddits: 'SideProject, startups, indiehackers',
    existingProductId: '',
    campaignName: '',
  });

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
  const updateForm = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));
  const togglePlatform = (id: string) => setFormData(prev => ({
    ...prev,
    selectedPlatforms: prev.selectedPlatforms.includes(id) ? prev.selectedPlatforms.filter(p => p !== id) : [...prev.selectedPlatforms, id],
  }));
  const selectAllPlatforms = () => setFormData(prev => ({ ...prev, selectedPlatforms: PLATFORM_OPTIONS.map(p => p.id) }));

  const launchCampaign = async () => {
    setSaving(true);
    try {
      // Step 1: Create or use existing product
      let productId = formData.existingProductId;
      if (!productId) {
        const productRes = await fetch('/api/products', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.productName, tagline: formData.tagline, description: formData.description,
            url: formData.url, category: formData.category, keywords: formData.keywords, pricing: formData.pricing,
          }),
        });
        const productData = await productRes.json();
        if (!productRes.ok) throw new Error(productData.error);
        productId = productData.id;
      }

      // Step 2: Create campaign
      const campaignRes = await fetch('/api/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          name: formData.campaignName || `${formData.productName} Launch`,
          targetPlatforms: formData.selectedPlatforms,
          targetSubreddits: formData.subreddits.split(',').map(s => s.trim()).filter(Boolean),
          createSocialPages: formData.createSocialPages,
          delayMinutes: formData.delayMinutes,
          scheduledAt: !formData.startImmediately && formData.scheduledDate ? new Date(formData.scheduledDate).toISOString() : undefined,
        }),
      });
      const campaignData = await campaignRes.json();
      if (!campaignRes.ok) throw new Error(campaignData.error);

      // Step 3: Launch immediately if selected
      if (formData.startImmediately) {
        const launchRes = await fetch(`/api/campaigns/${campaignData.id}/launch`, { method: 'POST' });
        if (!launchRes.ok) {
          const d = await launchRes.json();
          throw new Error(d.error);
        }
      }

      toast.success(formData.startImmediately ? 'Campaign launched!' : 'Campaign created (scheduled)');
      router.push('/campaigns');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/campaigns" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><ArrowLeft size={20} /></Link>
        <div><h1 className="text-2xl font-bold text-gray-900">New Campaign</h1><p className="text-gray-500">Set up your product launch in minutes</p></div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-200">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${i < currentStepIndex ? 'bg-green-100 text-green-600' : i === currentStepIndex ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
              {i < currentStepIndex ? <Check size={16} /> : i + 1}
            </div>
            <span className={`text-sm font-medium hidden md:block ${i === currentStepIndex ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        {currentStep === 'product' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Product Details</h2>
            {products && products.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Use existing product</label>
                <select value={formData.existingProductId} onChange={e => updateForm('existingProductId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="">Create new product...</option>
                  {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            {!formData.existingProductId && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                    <input type="text" value={formData.productName} onChange={e => updateForm('productName', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="MyApp" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Website URL *</label>
                    <input type="url" value={formData.url} onChange={e => updateForm('url', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="https://myapp.com" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Tagline * (60 chars)</label>
                  <input type="text" value={formData.tagline} onChange={e => updateForm('tagline', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="The simplest way to do X" maxLength={60} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea value={formData.description} onChange={e => updateForm('description', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg h-32" placeholder="Describe your product..." /></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select value={formData.category} onChange={e => updateForm('category', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="">Select...</option><option value="saas">SaaS</option><option value="developer-tools">Developer Tools</option><option value="productivity">Productivity</option><option value="marketing">Marketing</option><option value="ai">AI / ML</option><option value="design">Design</option><option value="finance">Finance</option><option value="education">Education</option>
                    </select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
                    <input type="text" value={formData.keywords} onChange={e => updateForm('keywords', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="saas, automation" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Pricing</label>
                    <select value={formData.pricing} onChange={e => updateForm('pricing', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="free">Free</option><option value="freemium">Freemium</option><option value="paid">Paid</option><option value="open-source">Open Source</option>
                    </select></div>
                </div>
              </>
            )}
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
              <input type="text" value={formData.campaignName} onChange={e => updateForm('campaignName', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="My Full Launch (optional)" /></div>
          </div>
        )}

        {currentStep === 'platforms' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><h2 className="text-lg font-semibold">Select Platforms</h2><p className="text-sm text-gray-500">{formData.selectedPlatforms.length} selected</p></div>
              <button onClick={selectAllPlatforms} className="text-sm text-brand-600 hover:text-brand-700 font-medium">Select All</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {PLATFORM_OPTIONS.map(platform => (
                <label key={platform.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${formData.selectedPlatforms.includes(platform.id) ? 'border-brand-300 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="checkbox" checked={formData.selectedPlatforms.includes(platform.id)} onChange={() => togglePlatform(platform.id)} className="rounded border-gray-300 text-brand-600" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">{platform.name}</span>
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${platform.auto === 'full' ? 'bg-green-100 text-green-700' : platform.auto === 'semi' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {platform.auto === 'full' ? 'Auto' : platform.auto === 'semi' ? 'Semi' : 'Manual'}
                    </span>
                  </div>
                </label>
              ))}
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Target Subreddits</h3>
              <input type="text" value={formData.subreddits} onChange={e => updateForm('subreddits', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="SideProject, startups (comma-separated)" />
            </div>
          </div>
        )}

        {currentStep === 'schedule' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Schedule & Timing</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer"><input type="radio" checked={formData.startImmediately} onChange={() => updateForm('startImmediately', true)} className="text-brand-600" /><div><p className="font-medium text-gray-900">Start immediately</p><p className="text-sm text-gray-500">Begin submissions right away</p></div></label>
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer"><input type="radio" checked={!formData.startImmediately} onChange={() => updateForm('startImmediately', false)} className="text-brand-600" /><div><p className="font-medium text-gray-900">Schedule for later</p><p className="text-sm text-gray-500">Pick a date and time</p></div></label>
            </div>
            {!formData.startImmediately && (
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time</label>
                <input type="datetime-local" value={formData.scheduledDate} onChange={e => updateForm('scheduledDate', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
            )}
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Delay between submissions (minutes)</label>
              <input type="number" value={formData.delayMinutes} onChange={e => updateForm('delayMinutes', parseInt(e.target.value))} className="w-32 px-3 py-2 border border-gray-300 rounded-lg" min={1} max={60} />
              <p className="text-xs text-gray-500 mt-1">Random variation added automatically to look natural</p></div>
          </div>
        )}

        {currentStep === 'review' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Review & Launch</h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Product</span><span className="font-medium">{formData.productName || '(existing)'}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Platforms</span><span className="font-medium">{formData.selectedPlatforms.length} selected</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Schedule</span><span className="font-medium">{formData.startImmediately ? 'Immediately' : formData.scheduledDate}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Delay</span><span className="font-medium">{formData.delayMinutes} min between</span></div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800"><strong>Note:</strong> Platforms marked "Manual" will attempt form fill but may need CAPTCHA solving. The worker will process submissions sequentially on the server.</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentStep(STEPS[currentStepIndex - 1]?.id || 'product')} disabled={currentStepIndex === 0}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"><ArrowLeft size={16} /> Back</button>
        {currentStepIndex < STEPS.length - 1 ? (
          <button onClick={() => setCurrentStep(STEPS[currentStepIndex + 1].id)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">Next <ArrowRight size={16} /></button>
        ) : (
          <button onClick={launchCampaign} disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Rocket size={18} />}
            {saving ? 'Launching...' : 'Launch Campaign'}
          </button>
        )}
      </div>
    </div>
  );
}
