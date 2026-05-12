'use client';

import { useState } from 'react';
import { Rocket, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';

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
  const [currentStep, setCurrentStep] = useState<Step>('product');
  const [formData, setFormData] = useState({
    // Product
    productName: '',
    tagline: '',
    description: '',
    url: '',
    category: '',
    keywords: '',
    pricing: 'free',
    // Platforms
    selectedPlatforms: [] as string[],
    createLinkedin: true,
    createFacebook: true,
    createInstagram: false,
    createTwitter: false,
    // Schedule
    startImmediately: true,
    scheduledDate: '',
    delayMinutes: 5,
    // Subreddits
    subreddits: 'SideProject, startups, indiehackers',
  });

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  const updateForm = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const togglePlatform = (id: string) => {
    setFormData(prev => ({
      ...prev,
      selectedPlatforms: prev.selectedPlatforms.includes(id)
        ? prev.selectedPlatforms.filter(p => p !== id)
        : [...prev.selectedPlatforms, id],
    }));
  };

  const selectAllPlatforms = () => {
    setFormData(prev => ({
      ...prev,
      selectedPlatforms: PLATFORM_OPTIONS.map(p => p.id),
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/campaigns" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Campaign</h1>
          <p className="text-gray-500">Set up your product launch in minutes</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-200">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              i < currentStepIndex ? 'bg-green-100 text-green-600'
              : i === currentStepIndex ? 'bg-brand-600 text-white'
              : 'bg-gray-100 text-gray-400'
            }`}>
              {i < currentStepIndex ? <Check size={16} /> : i + 1}
            </div>
            <span className={`text-sm font-medium ${i === currentStepIndex ? 'text-gray-900' : 'text-gray-400'}`}>
              {step.label}
            </span>
            {i < STEPS.length - 1 && <div className="w-12 h-px bg-gray-200 mx-2" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        {currentStep === 'product' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Product Details</h2>
            <p className="text-sm text-gray-500">Enter your product information once. We'll use it across all platforms.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input type="text" value={formData.productName} onChange={e => updateForm('productName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="MyAwesomeApp" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website URL *</label>
                <input type="url" value={formData.url} onChange={e => updateForm('url', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="https://myapp.com" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tagline * (60 chars max)</label>
              <input type="text" value={formData.tagline} onChange={e => updateForm('tagline', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                placeholder="The simplest way to do X" maxLength={60} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea value={formData.description} onChange={e => updateForm('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 h-32"
                placeholder="Describe your product in 2-3 sentences..." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={formData.category} onChange={e => updateForm('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
                  <option value="">Select...</option>
                  <option value="saas">SaaS</option>
                  <option value="developer-tools">Developer Tools</option>
                  <option value="productivity">Productivity</option>
                  <option value="marketing">Marketing</option>
                  <option value="ai">AI / ML</option>
                  <option value="design">Design</option>
                  <option value="finance">Finance</option>
                  <option value="education">Education</option>
                  <option value="health">Health</option>
                  <option value="ecommerce">E-commerce</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
                <input type="text" value={formData.keywords} onChange={e => updateForm('keywords', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="saas, automation, tool" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pricing</label>
                <select value={formData.pricing} onChange={e => updateForm('pricing', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
                  <option value="free">Free</option>
                  <option value="freemium">Freemium</option>
                  <option value="paid">Paid</option>
                  <option value="open-source">Open Source</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'platforms' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Select Platforms</h2>
                <p className="text-sm text-gray-500">{formData.selectedPlatforms.length} platforms selected</p>
              </div>
              <button onClick={selectAllPlatforms} className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                Select All
              </button>
            </div>

            {/* Social Page Creation */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Create Social Pages</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { key: 'createLinkedin', label: 'LinkedIn Page' },
                  { key: 'createFacebook', label: 'Facebook Page' },
                  { key: 'createInstagram', label: 'Instagram Profile' },
                  { key: 'createTwitter', label: 'Twitter/X Profile' },
                ].map(item => (
                  <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={(formData as any)[item.key]}
                      onChange={e => updateForm(item.key, e.target.checked)}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                    <span className="text-sm text-gray-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Platform Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {PLATFORM_OPTIONS.map(platform => (
                <label
                  key={platform.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.selectedPlatforms.includes(platform.id)
                      ? 'border-brand-300 bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input type="checkbox" checked={formData.selectedPlatforms.includes(platform.id)}
                    onChange={() => togglePlatform(platform.id)}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">{platform.name}</span>
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                      platform.auto === 'full' ? 'bg-green-100 text-green-700' :
                      platform.auto === 'semi' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {platform.auto === 'full' ? 'Auto' : platform.auto === 'semi' ? 'Semi-auto' : 'Manual'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 capitalize">{platform.category}</span>
                </label>
              ))}
            </div>

            {/* Reddit Subreddits */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Target Subreddits</h3>
              <input type="text" value={formData.subreddits} onChange={e => updateForm('subreddits', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="SideProject, startups, indiehackers (comma-separated)" />
            </div>
          </div>
        )}

        {currentStep === 'schedule' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Schedule & Timing</h2>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer">
                <input type="radio" checked={formData.startImmediately} onChange={() => updateForm('startImmediately', true)}
                  className="text-brand-600 focus:ring-brand-500" />
                <div>
                  <p className="font-medium text-gray-900">Start immediately</p>
                  <p className="text-sm text-gray-500">Begin submissions right away</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer">
                <input type="radio" checked={!formData.startImmediately} onChange={() => updateForm('startImmediately', false)}
                  className="text-brand-600 focus:ring-brand-500" />
                <div>
                  <p className="font-medium text-gray-900">Schedule for later</p>
                  <p className="text-sm text-gray-500">Pick a date and time</p>
                </div>
              </label>
            </div>

            {!formData.startImmediately && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time</label>
                <input type="datetime-local" value={formData.scheduledDate} onChange={e => updateForm('scheduledDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delay between submissions (minutes)</label>
              <input type="number" value={formData.delayMinutes} onChange={e => updateForm('delayMinutes', parseInt(e.target.value))}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg" min={1} max={60} />
              <p className="text-xs text-gray-500 mt-1">Random +/- 2 minutes added automatically to look natural</p>
            </div>
          </div>
        )}

        {currentStep === 'review' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Review & Launch</h2>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Product</span>
                <span className="text-sm font-medium">{formData.productName || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">URL</span>
                <span className="text-sm font-medium">{formData.url || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Platforms</span>
                <span className="text-sm font-medium">{formData.selectedPlatforms.length} selected</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Social Pages</span>
                <span className="text-sm font-medium">
                  {[formData.createLinkedin && 'LinkedIn', formData.createFacebook && 'Facebook',
                    formData.createInstagram && 'Instagram', formData.createTwitter && 'Twitter'].filter(Boolean).join(', ') || 'None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Schedule</span>
                <span className="text-sm font-medium">{formData.startImmediately ? 'Immediately' : formData.scheduledDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Delay</span>
                <span className="text-sm font-medium">{formData.delayMinutes} min between submissions</span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> Platforms marked as "Manual" will pre-fill content and open the browser for you to click submit. 
                Platforms with CAPTCHA will pause for you to solve manually.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentStep(STEPS[currentStepIndex - 1]?.id || 'product')}
          disabled={currentStepIndex === 0}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft size={16} /> Back
        </button>

        {currentStepIndex < STEPS.length - 1 ? (
          <button
            onClick={() => setCurrentStep(STEPS[currentStepIndex + 1].id)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
          >
            Next <ArrowRight size={16} />
          </button>
        ) : (
          <button className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
            <Rocket size={18} /> Launch Campaign
          </button>
        )}
      </div>
    </div>
  );
}
