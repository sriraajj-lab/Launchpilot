/**
 * Launch Pilot - Platform Registry
 * 
 * Configuration for 30+ platforms including URLs, form selectors,
 * automation difficulty levels, and submission strategies.
 */

export type AutomationLevel = 'full' | 'semi' | 'manual';
export type PlatformCategory = 'directory' | 'social' | 'listing' | 'review' | 'seo' | 'outreach';

export interface PlatformConfig {
  id: string;
  name: string;
  url: string;
  submitUrl: string;
  category: PlatformCategory;
  automationLevel: AutomationLevel;
  description: string;
  fields: PlatformField[];
  loginRequired: boolean;
  hasCaptcha: boolean;
  requiresApproval: boolean;
  estimatedTime: number; // minutes
  notes?: string;
}

export interface PlatformField {
  name: string;
  selector: string;
  type: 'text' | 'textarea' | 'select' | 'file' | 'url' | 'email' | 'checkbox';
  required: boolean;
  mapTo: string; // maps to product field (e.g., 'name', 'description', 'url')
  maxLength?: number;
}

export const PLATFORMS: PlatformConfig[] = [
  // === PRODUCT DIRECTORIES ===
  {
    id: 'product_hunt',
    name: 'Product Hunt',
    url: 'https://www.producthunt.com',
    submitUrl: 'https://www.producthunt.com/posts/new',
    category: 'directory',
    automationLevel: 'semi',
    description: 'The #1 place to launch new products. High traffic, engaged community.',
    loginRequired: true,
    hasCaptcha: false,
    requiresApproval: false,
    estimatedTime: 5,
    notes: 'Best to launch on Tuesday-Thursday. Schedule for 12:01 AM PST.',
    fields: [
      { name: 'Product Name', selector: 'input[name="name"]', type: 'text', required: true, mapTo: 'name' },
      { name: 'Tagline', selector: 'input[name="tagline"]', type: 'text', required: true, mapTo: 'tagline', maxLength: 60 },
      { name: 'URL', selector: 'input[name="url"]', type: 'url', required: true, mapTo: 'url' },
      { name: 'Description', selector: 'textarea[name="description"]', type: 'textarea', required: true, mapTo: 'description' },
      { name: 'Thumbnail', selector: 'input[type="file"]', type: 'file', required: true, mapTo: 'logo' },
    ],
  },
  {
    id: 'betalist',
    name: 'BetaList',
    url: 'https://betalist.com',
    submitUrl: 'https://betalist.com/submit',
    category: 'directory',
    automationLevel: 'full',
    description: 'Discover and get early access to tomorrow\'s startups.',
    loginRequired: true,
    hasCaptcha: false,
    requiresApproval: true,
    estimatedTime: 3,
    fields: [
      { name: 'Startup Name', selector: 'input[name="startup[name]"]', type: 'text', required: true, mapTo: 'name' },
      { name: 'URL', selector: 'input[name="startup[url]"]', type: 'url', required: true, mapTo: 'url' },
      { name: 'Tagline', selector: 'input[name="startup[tagline]"]', type: 'text', required: true, mapTo: 'tagline' },
      { name: 'Description', selector: 'textarea[name="startup[description]"]', type: 'textarea', required: true, mapTo: 'description' },
      { name: 'Email', selector: 'input[name="startup[email]"]', type: 'email', required: true, mapTo: 'email' },
    ],
  },
  {
    id: 'indie_hackers',
    name: 'Indie Hackers',
    url: 'https://www.indiehackers.com',
    submitUrl: 'https://www.indiehackers.com/products/new',
    category: 'directory',
    automationLevel: 'semi',
    description: 'Community for indie makers building profitable businesses.',
    loginRequired: true,
    hasCaptcha: false,
    requiresApproval: false,
    estimatedTime: 5,
    fields: [
      { name: 'Product Name', selector: 'input[name="name"]', type: 'text', required: true, mapTo: 'name' },
      { name: 'Tagline', selector: 'input[name="tagline"]', type: 'text', required: true, mapTo: 'tagline' },
      { name: 'Website', selector: 'input[name="website"]', type: 'url', required: true, mapTo: 'url' },
      { name: 'Description', selector: 'textarea[name="description"]', type: 'textarea', required: true, mapTo: 'description' },
    ],
  },
  {
    id: 'alternativeto',
    name: 'AlternativeTo',
    url: 'https://alternativeto.net',
    submitUrl: 'https://alternativeto.net/manage/add-app/',
    category: 'directory',
    automationLevel: 'full',
    description: 'Crowdsourced software recommendations. Great for SEO.',
    loginRequired: true,
    hasCaptcha: true,
    requiresApproval: true,
    estimatedTime: 4,
    fields: [
      { name: 'App Name', selector: 'input[name="name"]', type: 'text', required: true, mapTo: 'name' },
      { name: 'URL', selector: 'input[name="url"]', type: 'url', required: true, mapTo: 'url' },
      { name: 'Description', selector: 'textarea[name="description"]', type: 'textarea', required: true, mapTo: 'description' },
      { name: 'License', selector: 'select[name="license"]', type: 'select', required: true, mapTo: 'pricing' },
    ],
  },
  {
    id: 'saashub',
    name: 'SaaSHub',
    url: 'https://www.saashub.com',
    submitUrl: 'https://www.saashub.com/submit',
    category: 'directory',
    automationLevel: 'full',
    description: 'Independent software marketplace. Good backlink.',
    loginRequired: false,
    hasCaptcha: true,
    requiresApproval: true,
    estimatedTime: 3,
    fields: [
      { name: 'Service Name', selector: 'input[name="name"]', type: 'text', required: true, mapTo: 'name' },
      { name: 'URL', selector: 'input[name="url"]', type: 'url', required: true, mapTo: 'url' },
      { name: 'Description', selector: 'textarea[name="description"]', type: 'textarea', required: true, mapTo: 'description' },
      { name: 'Email', selector: 'input[name="email"]', type: 'email', required: true, mapTo: 'email' },
    ],
  },
  {
    id: 'g2',
    name: 'G2',
    url: 'https://www.g2.com',
    submitUrl: 'https://www.g2.com/products/new',
    category: 'review',
    automationLevel: 'semi',
    description: 'Leading B2B software review platform. High authority.',
    loginRequired: true,
    hasCaptcha: false,
    requiresApproval: true,
    estimatedTime: 10,
    fields: [
      { name: 'Product Name', selector: 'input[name="product_name"]', type: 'text', required: true, mapTo: 'name' },
      { name: 'Website', selector: 'input[name="website"]', type: 'url', required: true, mapTo: 'url' },
      { name: 'Description', selector: 'textarea[name="description"]', type: 'textarea', required: true, mapTo: 'description' },
      { name: 'Category', selector: 'select[name="category"]', type: 'select', required: true, mapTo: 'category' },
    ],
  },
  {
    id: 'capterra',
    name: 'Capterra',
    url: 'https://www.capterra.com',
    submitUrl: 'https://www.capterra.com/vendors/sign-up',
    category: 'review',
    automationLevel: 'semi',
    description: 'Major software review site. Great for B2B visibility.',
    loginRequired: true,
    hasCaptcha: true,
    requiresApproval: true,
    estimatedTime: 15,
    fields: [
      { name: 'Software Name', selector: 'input[name="software_name"]', type: 'text', required: true, mapTo: 'name' },
      { name: 'Website', selector: 'input[name="website"]', type: 'url', required: true, mapTo: 'url' },
      { name: 'Description', selector: 'textarea[name="description"]', type: 'textarea', required: true, mapTo: 'description' },
    ],
  },
  {
    id: 'getapp',
    name: 'GetApp',
    url: 'https://www.getapp.com',
    submitUrl: 'https://www.getapp.com/submit',
    category: 'review',
    automationLevel: 'semi',
    description: 'Software review and comparison platform (owned by Gartner).',
    loginRequired: true,
    hasCaptcha: true,
    requiresApproval: true,
    estimatedTime: 10,
    fields: [
      { name: 'Product Name', selector: 'input[name="name"]', type: 'text', required: true, mapTo: 'name' },
      { name: 'URL', selector: 'input[name="url"]', type: 'url', required: true, mapTo: 'url' },
      { name: 'Description', selector: 'textarea[name="description"]', type: 'textarea', required: true, mapTo: 'description' },
    ],
  },
  // === STARTUP LISTINGS ===
  {
    id: 'crunchbase',
    name: 'Crunchbase',
    url: 'https://www.crunchbase.com',
    submitUrl: 'https://www.crunchbase.com/add-new',
    category: 'listing',
    automationLevel: 'semi',
    description: 'Business data platform. Essential for startup credibility.',
    loginRequired: true,
    hasCaptcha: false,
    requiresApproval: true,
    estimatedTime: 10,
    fields: [
      { name: 'Organization Name', selector: 'input[name="name"]', type: 'text', required: true, mapTo: 'name' },
      { name: 'Website', selector: 'input[name="website"]', type: 'url', required: true, mapTo: 'url' },
      { name: 'Short Description', selector: 'textarea[name="short_description"]', type: 'textarea', required: true, mapTo: 'tagline' },
      { name: 'Description', selector: 'textarea[name="description"]', type: 'textarea', required: true, mapTo: 'description' },
    ],
  },
  {
    id: 'angellist',
    name: 'AngelList / Wellfound',
    url: 'https://wellfound.com',
    submitUrl: 'https://wellfound.com/companies/apply',
    category: 'listing',
    automationLevel: 'semi',
    description: 'Startup job board and investor network.',
    loginRequired: true,
    hasCaptcha: false,
    requiresApproval: true,
    estimatedTime: 8,
    fields: [
      { name: 'Company Name', selector: 'input[name="name"]', type: 'text', required: true, mapTo: 'name' },
      { name: 'Website', selector: 'input[name="website"]', type: 'url', required: true, mapTo: 'url' },
      { name: 'Tagline', selector: 'input[name="tagline"]', type: 'text', required: true, mapTo: 'tagline' },
      { name: 'Description', selector: 'textarea[name="description"]', type: 'textarea', required: true, mapTo: 'description' },
    ],
  },
  {
    id: 'startup_base',
    name: 'StartupBase',
    url: 'https://startupbase.io',
    submitUrl: 'https://startupbase.io/submit',
    category: 'listing',
    automationLevel: 'full',
    description: 'Startup directory. Quick submission, good backlink.',
    loginRequired: false,
    hasCaptcha: false,
    requiresApproval: true,
    estimatedTime: 2,
    fields: [
      { name: 'Startup Name', selector: 'input[name="name"]', type: 'text', required: true, mapTo: 'name' },
      { name: 'URL', selector: 'input[name="url"]', type: 'url', required: true, mapTo: 'url' },
      { name: 'Tagline', selector: 'input[name="tagline"]', type: 'text', required: true, mapTo: 'tagline' },
      { name: 'Description', selector: 'textarea[name="description"]', type: 'textarea', required: true, mapTo: 'description' },
    ],
  },
  {
    id: 'launching_next',
    name: 'Launching Next',
    url: 'https://www.launchingnext.com',
    submitUrl: 'https://www.launchingnext.com/submit/',
    category: 'listing',
    automationLevel: 'full',
    description: 'Startup directory focused on new launches.',
    loginRequired: false,
    hasCaptcha: true,
    requiresApproval: true,
    estimatedTime: 3,
    fields: [
      { name: 'Name', selector: 'input[name="name"]', type: 'text', required: true, mapTo: 'name' },
      { name: 'URL', selector: 'input[name="url"]', type: 'url', required: true, mapTo: 'url' },
      { name: 'Description', selector: 'textarea[name="description"]', type: 'textarea', required: true, mapTo: 'description' },
      { name: 'Email', selector: 'input[name="email"]', type: 'email', required: true, mapTo: 'email' },
    ],
  },
  {
    id: 'startup_ranking',
    name: 'StartupRanking',
    url: 'https://www.startupranking.com',
    submitUrl: 'https://www.startupranking.com/startup/create',
    category: 'listing',
    automationLevel: 'full',
    description: 'Ranks startups globally. Good for visibility.',
    loginRequired: true,
    hasCaptcha: false,
    requiresApproval: false,
    estimatedTime: 3,
    fields: [
      { name: 'Startup Name', selector: 'input[name="name"]', type: 'text', required: true, mapTo: 'name' },
      { name: 'URL', selector: 'input[name="url"]', type: 'url', required: true, mapTo: 'url' },
      { name: 'Description', selector: 'textarea[name="description"]', type: 'textarea', required: true, mapTo: 'description' },
    ],
  },
  // === SOCIAL PLATFORMS ===
  {
    id: 'reddit',
    name: 'Reddit',
    url: 'https://www.reddit.com',
    submitUrl: 'https://www.reddit.com/submit',
    category: 'social',
    automationLevel: 'manual',
    description: 'Massive community. Anti-bot detection, needs karma. Pre-fill content only.',
    loginRequired: true,
    hasCaptcha: true,
    requiresApproval: false,
    estimatedTime: 5,
    notes: 'Heavy anti-bot. Tool pre-fills content, user clicks submit manually.',
    fields: [
      { name: 'Title', selector: 'textarea[name="title"]', type: 'textarea', required: true, mapTo: 'name' },
      { name: 'URL/Text', selector: 'textarea[name="text"]', type: 'textarea', required: true, mapTo: 'description' },
    ],
  },
  {
    id: 'hackernews',
    name: 'Hacker News',
    url: 'https://news.ycombinator.com',
    submitUrl: 'https://news.ycombinator.com/submit',
    category: 'social',
    automationLevel: 'semi',
    description: 'Tech-focused community. High-quality traffic if it hits front page.',
    loginRequired: true,
    hasCaptcha: false,
    requiresApproval: false,
    estimatedTime: 2,
    notes: 'Simple form but community can be harsh. Title matters a lot.',
    fields: [
      { name: 'Title', selector: 'input[name="title"]', type: 'text', required: true, mapTo: 'name', maxLength: 80 },
      { name: 'URL', selector: 'input[name="url"]', type: 'url', required: true, mapTo: 'url' },
    ],
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    url: 'https://x.com',
    submitUrl: 'https://x.com/compose/tweet',
    category: 'social',
    automationLevel: 'semi',
    description: 'Launch announcement tweet/thread.',
    loginRequired: true,
    hasCaptcha: false,
    requiresApproval: false,
    estimatedTime: 2,
    fields: [
      { name: 'Tweet', selector: '[data-testid="tweetTextarea_0"]', type: 'textarea', required: true, mapTo: 'description', maxLength: 280 },
    ],
  },
  {
    id: 'linkedin_post',
    name: 'LinkedIn Post',
    url: 'https://www.linkedin.com',
    submitUrl: 'https://www.linkedin.com/feed/',
    category: 'social',
    automationLevel: 'manual',
    description: 'LinkedIn post for professional audience. Anti-automation heavy.',
    loginRequired: true,
    hasCaptcha: false,
    requiresApproval: false,
    estimatedTime: 3,
    notes: 'Very aggressive anti-automation. Pre-fill and manual submit.',
    fields: [
      { name: 'Post Content', selector: '.ql-editor', type: 'textarea', required: true, mapTo: 'description' },
    ],
  },
  // === SEO / BACKLINK DIRECTORIES ===
  {
    id: 'toolify',
    name: 'Toolify.ai',
    url: 'https://www.toolify.ai',
    submitUrl: 'https://www.toolify.ai/submit',
    category: 'seo',
    automationLevel: 'full',
    description: 'AI tools directory. Great if product uses AI.',
    loginRequired: false,
    hasCaptcha: false,
    requiresApproval: true,
    estimatedTime: 2,
    fields: [
      { name: 'Tool Name', selector: 'input[name="name"]', type: 'text', required: true, mapTo: 'name' },
      { name: 'URL', selector: 'input[name="url"]', type: 'url', required: true, mapTo: 'url' },
      { name: 'Description', selector: 'textarea[name="description"]', type: 'textarea', required: true, mapTo: 'description' },
    ],
  },
  {
    id: 'there_is_an_ai',
    name: 'There Is An AI For That',
    url: 'https://theresanaiforthat.com',
    submitUrl: 'https://theresanaiforthat.com/submit/',
    category: 'seo',
    automationLevel: 'full',
    description: 'Popular AI tool directory.',
    loginRequired: false,
    hasCaptcha: false,
    requiresApproval: true,
    estimatedTime: 2,
    fields: [
      { name: 'Name', selector: 'input[name="name"]', type: 'text', required: true, mapTo: 'name' },
      { name: 'URL', selector: 'input[name="url"]', type: 'url', required: true, mapTo: 'url' },
      { name: 'Description', selector: 'textarea[name="description"]', type: 'textarea', required: true, mapTo: 'description' },
    ],
  },
  {
    id: 'futurepedia',
    name: 'Futurepedia',
    url: 'https://www.futurepedia.io',
    submitUrl: 'https://www.futurepedia.io/submit-tool',
    category: 'seo',
    automationLevel: 'full',
    description: 'AI tools directory with good SEO juice.',
    loginRequired: false,
    hasCaptcha: false,
    requiresApproval: true,
    estimatedTime: 2,
    fields: [
      { name: 'Tool Name', selector: 'input[name="name"]', type: 'text', required: true, mapTo: 'name' },
      { name: 'URL', selector: 'input[name="url"]', type: 'url', required: true, mapTo: 'url' },
      { name: 'Description', selector: 'textarea[name="description"]', type: 'textarea', required: true, mapTo: 'description' },
    ],
  },
  {
    id: 'microlaunch',
    name: 'MicroLaunch',
    url: 'https://microlaunch.net',
    submitUrl: 'https://microlaunch.net/submit',
    category: 'directory',
    automationLevel: 'full',
    description: 'Micro-SaaS launch platform. Supportive community.',
    loginRequired: false,
    hasCaptcha: false,
    requiresApproval: true,
    estimatedTime: 3,
    fields: [
      { name: 'Product Name', selector: 'input[name="name"]', type: 'text', required: true, mapTo: 'name' },
      { name: 'URL', selector: 'input[name="url"]', type: 'url', required: true, mapTo: 'url' },
      { name: 'Tagline', selector: 'input[name="tagline"]', type: 'text', required: true, mapTo: 'tagline' },
      { name: 'Description', selector: 'textarea[name="description"]', type: 'textarea', required: true, mapTo: 'description' },
    ],
  },
  {
    id: 'uneed',
    name: 'Uneed',
    url: 'https://www.uneed.best',
    submitUrl: 'https://www.uneed.best/submit',
    category: 'directory',
    automationLevel: 'full',
    description: 'Curated tool directory. Clean UI.',
    loginRequired: false,
    hasCaptcha: false,
    requiresApproval: true,
    estimatedTime: 2,
    fields: [
      { name: 'Name', selector: 'input[name="name"]', type: 'text', required: true, mapTo: 'name' },
      { name: 'URL', selector: 'input[name="url"]', type: 'url', required: true, mapTo: 'url' },
      { name: 'Description', selector: 'textarea[name="description"]', type: 'textarea', required: true, mapTo: 'description' },
    ],
  },
  {
    id: 'devhunt',
    name: 'DevHunt',
    url: 'https://devhunt.org',
    submitUrl: 'https://devhunt.org/submit',
    category: 'directory',
    automationLevel: 'full',
    description: 'Developer tool launches. Product Hunt alternative for dev tools.',
    loginRequired: true,
    hasCaptcha: false,
    requiresApproval: false,
    estimatedTime: 3,
    fields: [
      { name: 'Tool Name', selector: 'input[name="name"]', type: 'text', required: true, mapTo: 'name' },
      { name: 'URL', selector: 'input[name="url"]', type: 'url', required: true, mapTo: 'url' },
      { name: 'Description', selector: 'textarea[name="description"]', type: 'textarea', required: true, mapTo: 'description' },
    ],
  },
  {
    id: 'pitchwall',
    name: 'PitchWall',
    url: 'https://pitchwall.co',
    submitUrl: 'https://pitchwall.co/submit',
    category: 'directory',
    automationLevel: 'full',
    description: 'Startup pitch directory.',
    loginRequired: false,
    hasCaptcha: false,
    requiresApproval: true,
    estimatedTime: 2,
    fields: [
      { name: 'Name', selector: 'input[name="name"]', type: 'text', required: true, mapTo: 'name' },
      { name: 'URL', selector: 'input[name="url"]', type: 'url', required: true, mapTo: 'url' },
      { name: 'Pitch', selector: 'textarea[name="pitch"]', type: 'textarea', required: true, mapTo: 'tagline' },
    ],
  },
  {
    id: 'stackshare',
    name: 'StackShare',
    url: 'https://stackshare.io',
    submitUrl: 'https://stackshare.io/tools/new',
    category: 'listing',
    automationLevel: 'full',
    description: 'Tech stack sharing platform. Great for developer tools.',
    loginRequired: true,
    hasCaptcha: false,
    requiresApproval: true,
    estimatedTime: 5,
    fields: [
      { name: 'Tool Name', selector: 'input[name="name"]', type: 'text', required: true, mapTo: 'name' },
      { name: 'URL', selector: 'input[name="url"]', type: 'url', required: true, mapTo: 'url' },
      { name: 'Description', selector: 'textarea[name="description"]', type: 'textarea', required: true, mapTo: 'description' },
    ],
  },
];

// Helper functions
export function getPlatformById(id: string): PlatformConfig | undefined {
  return PLATFORMS.find(p => p.id === id);
}

export function getPlatformsByCategory(category: PlatformCategory): PlatformConfig[] {
  return PLATFORMS.filter(p => p.category === category);
}

export function getFullyAutomatedPlatforms(): PlatformConfig[] {
  return PLATFORMS.filter(p => p.automationLevel === 'full');
}

export function getSemiAutomatedPlatforms(): PlatformConfig[] {
  return PLATFORMS.filter(p => p.automationLevel === 'semi');
}

export function getManualPlatforms(): PlatformConfig[] {
  return PLATFORMS.filter(p => p.automationLevel === 'manual');
}

export function getPlatformsWithoutCaptcha(): PlatformConfig[] {
  return PLATFORMS.filter(p => !p.hasCaptcha);
}

export function getPlatformStats() {
  return {
    total: PLATFORMS.length,
    fullyAutomated: PLATFORMS.filter(p => p.automationLevel === 'full').length,
    semiAutomated: PLATFORMS.filter(p => p.automationLevel === 'semi').length,
    manual: PLATFORMS.filter(p => p.automationLevel === 'manual').length,
    byCategory: {
      directory: PLATFORMS.filter(p => p.category === 'directory').length,
      social: PLATFORMS.filter(p => p.category === 'social').length,
      listing: PLATFORMS.filter(p => p.category === 'listing').length,
      review: PLATFORMS.filter(p => p.category === 'review').length,
      seo: PLATFORMS.filter(p => p.category === 'seo').length,
    },
  };
}
