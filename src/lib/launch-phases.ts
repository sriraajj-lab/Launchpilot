/**
 * Launch Pilot - Phased Launch Strategy Engine
 * 
 * Inspired by coreyhaines31/marketingskills launch-strategy skill.
 * Instead of blasting all platforms at once, structures the campaign
 * into timed phases for maximum momentum and sustained visibility.
 * 
 * Framework: Owned → Rented → Borrowed channels
 * - Owned: Your social profiles, your blog, your email list
 * - Rented: Platforms where you have accounts (Reddit, HN, Twitter)
 * - Borrowed: Directories and listings (Product Hunt, BetaList, etc.)
 */

import { PlatformConfig, PLATFORMS } from './platforms/registry';

export type LaunchPhase = 'pre_launch' | 'launch_day' | 'post_launch_wave1' | 'post_launch_wave2' | 'sustain';

export interface PhaseConfig {
  id: LaunchPhase;
  name: string;
  description: string;
  dayOffset: number; // days from launch start (0 = launch day, -3 = 3 days before)
  duration: number; // hours this phase runs
  platforms: string[]; // platform IDs to target
  actions: PhaseAction[];
  tips: string[];
}

export interface PhaseAction {
  type: 'submit' | 'post' | 'create_page' | 'engage' | 'follow_up' | 'blog' | 'email';
  platform?: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  automatable: boolean;
  delayMinutes?: number; // delay after phase starts
}

export interface LaunchPlan {
  productName: string;
  totalDays: number;
  phases: PhaseConfig[];
  summary: {
    totalActions: number;
    automatedActions: number;
    manualActions: number;
    platformCount: number;
  };
}

/**
 * Generate a full phased launch plan from product info and selected platforms
 */
export function generateLaunchPlan(
  productName: string,
  selectedPlatformIds: string[],
  options?: {
    includePreLaunch?: boolean;
    aggressiveness?: 'conservative' | 'normal' | 'aggressive';
  }
): LaunchPlan {
  const { includePreLaunch = true, aggressiveness = 'normal' } = options || {};
  
  const phases: PhaseConfig[] = [];

  // === PHASE 0: PRE-LAUNCH (Day -3 to -1) ===
  if (includePreLaunch) {
    phases.push({
      id: 'pre_launch',
      name: 'Pre-Launch Buzz',
      description: 'Build anticipation. Set up your owned channels first.',
      dayOffset: -3,
      duration: 72, // 3 days
      platforms: filterPlatforms(selectedPlatformIds, ['linkedin_post', 'twitter']),
      actions: [
        {
          type: 'create_page',
          platform: 'linkedin',
          description: 'Create LinkedIn Company Page with product details',
          priority: 'high',
          automatable: true,
          delayMinutes: 0,
        },
        {
          type: 'create_page',
          platform: 'twitter',
          description: 'Set up Twitter/X profile with product branding',
          priority: 'high',
          automatable: true,
          delayMinutes: 30,
        },
        {
          type: 'create_page',
          platform: 'facebook',
          description: 'Create Facebook Business Page',
          priority: 'medium',
          automatable: true,
          delayMinutes: 60,
        },
        {
          type: 'post',
          platform: 'twitter',
          description: 'Teaser tweet: "Something big coming soon..." with screenshot',
          priority: 'medium',
          automatable: false,
          delayMinutes: 1440, // Day -2
        },
        {
          type: 'post',
          platform: 'linkedin_post',
          description: 'Pre-launch post: Share the problem you\'re solving',
          priority: 'medium',
          automatable: false,
          delayMinutes: 2880, // Day -1
        },
        {
          type: 'blog',
          description: 'Publish SEO-optimized launch blog post (scheduled to go live on launch day)',
          priority: 'high',
          automatable: true,
          delayMinutes: 2880,
        },
      ],
      tips: [
        'Set up all social profiles BEFORE launch day',
        'Tease without revealing - build curiosity',
        'Tell your personal network to be ready to support',
        'Prepare all content in advance, just schedule it',
      ],
    });
  }

  // === PHASE 1: LAUNCH DAY BLITZ (Day 0, hours 0-12) ===
  phases.push({
    id: 'launch_day',
    name: 'Launch Day Blitz',
    description: 'Maximum visibility. Hit all high-traffic platforms simultaneously.',
    dayOffset: 0,
    duration: 12,
    platforms: filterPlatforms(selectedPlatformIds, [
      'product_hunt', 'hackernews', 'twitter', 'linkedin_post', 'reddit',
    ]),
    actions: [
      {
        type: 'submit',
        platform: 'product_hunt',
        description: 'Submit to Product Hunt (schedule for 12:01 AM PST)',
        priority: 'critical',
        automatable: true,
        delayMinutes: 0,
      },
      {
        type: 'submit',
        platform: 'hackernews',
        description: 'Submit "Show HN" post',
        priority: 'critical',
        automatable: true,
        delayMinutes: 60, // 1 hour after PH
      },
      {
        type: 'post',
        platform: 'twitter',
        description: 'Launch announcement tweet + thread',
        priority: 'critical',
        automatable: true,
        delayMinutes: 30,
      },
      {
        type: 'post',
        platform: 'linkedin_post',
        description: 'LinkedIn launch announcement post',
        priority: 'high',
        automatable: true,
        delayMinutes: 90,
      },
      {
        type: 'post',
        platform: 'reddit',
        description: 'Post to r/SideProject (most launch-friendly)',
        priority: 'high',
        automatable: false, // Reddit needs manual submit
        delayMinutes: 120,
      },
      {
        type: 'engage',
        description: 'Reply to ALL comments on PH, HN, Reddit within 2 hours',
        priority: 'critical',
        automatable: false,
        delayMinutes: 180,
      },
      {
        type: 'post',
        platform: 'reddit',
        description: 'Post to r/startups',
        priority: 'medium',
        automatable: false,
        delayMinutes: 360, // 6 hours later
      },
    ],
    tips: [
      'Be online ALL DAY to reply to comments',
      'Product Hunt: Ask network to leave genuine comments (NOT just upvotes)',
      'HN: Reply with technical details, be humble',
      'Reddit: Don\'t post to more than 2-3 subreddits on same day',
      'NEVER ask for upvotes anywhere - instant ban',
    ],
  });

  // === PHASE 2: POST-LAUNCH WAVE 1 (Days 1-3) ===
  phases.push({
    id: 'post_launch_wave1',
    name: 'Directory Submission Wave',
    description: 'Submit to all directories and startup listings. Steady drip, not flood.',
    dayOffset: 1,
    duration: 72, // 3 days
    platforms: filterPlatforms(selectedPlatformIds, [
      'betalist', 'indie_hackers', 'saashub', 'alternativeto', 'crunchbase',
      'startup_base', 'launching_next', 'startup_ranking', 'devhunt',
      'microlaunch', 'uneed', 'pitchwall', 'stackshare',
    ]),
    actions: generateDirectoryActions(selectedPlatformIds, aggressiveness),
    tips: [
      'Submit 3-5 directories per day max (looks natural)',
      'Vary your descriptions slightly for each directory',
      'Check email for verification/approval requests',
      'Some directories take 1-7 days to approve - be patient',
    ],
  });

  // === PHASE 3: POST-LAUNCH WAVE 2 (Days 4-7) ===
  phases.push({
    id: 'post_launch_wave2',
    name: 'Community & Outreach Wave',
    description: 'Engage communities, post in niche subreddits, start outreach.',
    dayOffset: 4,
    duration: 96, // 4 days
    platforms: filterPlatforms(selectedPlatformIds, [
      'reddit', 'twitter', 'linkedin_post',
      'g2', 'capterra', 'getapp', 'angellist',
    ]),
    actions: [
      {
        type: 'post',
        platform: 'reddit',
        description: 'Post to niche-specific subreddits (r/indiehackers, r/microsaas, etc.)',
        priority: 'high',
        automatable: false,
        delayMinutes: 0,
      },
      {
        type: 'submit',
        platform: 'g2',
        description: 'Submit to G2 (requires more setup)',
        priority: 'medium',
        automatable: true,
        delayMinutes: 1440,
      },
      {
        type: 'submit',
        platform: 'capterra',
        description: 'Submit to Capterra',
        priority: 'medium',
        automatable: true,
        delayMinutes: 2880,
      },
      {
        type: 'email',
        description: 'Follow up with directories that haven\'t approved after 3 days',
        priority: 'high',
        automatable: true,
        delayMinutes: 0,
      },
      {
        type: 'post',
        platform: 'twitter',
        description: 'Share first user testimonial/feedback tweet',
        priority: 'medium',
        automatable: false,
        delayMinutes: 2880,
      },
      {
        type: 'engage',
        description: 'Join relevant Slack/Discord communities and introduce yourself',
        priority: 'medium',
        automatable: false,
        delayMinutes: 1440,
      },
    ],
    tips: [
      'By now you should have feedback - use it in your messaging',
      'Don\'t spam multiple subreddits same day - space them out',
      'Start collecting testimonials for social proof',
      'Follow up with directories that haven\'t responded',
    ],
  });

  // === PHASE 4: SUSTAIN (Days 8-30) ===
  phases.push({
    id: 'sustain',
    name: 'Sustain & Grow',
    description: 'Keep momentum. Regular content, engage communities, SEO backlinks.',
    dayOffset: 8,
    duration: 528, // 22 days
    platforms: filterPlatforms(selectedPlatformIds, [
      'twitter', 'linkedin_post', 'reddit',
      'toolify', 'there_is_an_ai', 'futurepedia',
    ]),
    actions: [
      {
        type: 'post',
        platform: 'twitter',
        description: 'Weekly build-in-public updates (features, metrics, learnings)',
        priority: 'high',
        automatable: false,
        delayMinutes: 0,
      },
      {
        type: 'post',
        platform: 'linkedin_post',
        description: 'Bi-weekly LinkedIn posts (lessons learned, growth updates)',
        priority: 'medium',
        automatable: false,
        delayMinutes: 10080, // week 2
      },
      {
        type: 'submit',
        description: 'Submit to AI-specific directories (Toolify, TAAFT, Futurepedia) if applicable',
        priority: 'low',
        automatable: true,
        delayMinutes: 1440,
      },
      {
        type: 'engage',
        description: 'Answer questions in relevant communities where your tool is a genuine solution',
        priority: 'high',
        automatable: false,
        delayMinutes: 0,
      },
      {
        type: 'follow_up',
        description: 'Second follow-up to unapproved directories (polite check-in)',
        priority: 'medium',
        automatable: true,
        delayMinutes: 10080,
      },
      {
        type: 'blog',
        description: 'Publish 2nd blog post targeting long-tail keywords from your niche',
        priority: 'medium',
        automatable: true,
        delayMinutes: 14400, // day 18
      },
    ],
    tips: [
      'Consistency > intensity at this stage',
      'Share genuine learnings, not just promotions',
      'Engage in communities where your product solves real problems',
      'Monitor which directories actually send traffic - double down on those',
      'Start thinking about SEO: write content targeting "[competitor] alternative" keywords',
    ],
  });

  // Calculate summary
  const allActions = phases.flatMap(p => p.actions);
  const allPlatformIds = new Set(phases.flatMap(p => p.platforms));

  return {
    productName,
    totalDays: includePreLaunch ? 33 : 30,
    phases,
    summary: {
      totalActions: allActions.length,
      automatedActions: allActions.filter(a => a.automatable).length,
      manualActions: allActions.filter(a => !a.automatable).length,
      platformCount: allPlatformIds.size,
    },
  };
}

/**
 * Generate staggered directory submission actions
 */
function generateDirectoryActions(selectedIds: string[], aggressiveness: string): PhaseAction[] {
  const directoryPlatforms = PLATFORMS.filter(
    p => selectedIds.includes(p.id) && ['directory', 'listing', 'seo'].includes(p.category)
  );

  const perDay = aggressiveness === 'aggressive' ? 6 : aggressiveness === 'conservative' ? 2 : 4;
  
  return directoryPlatforms.map((platform, i) => ({
    type: 'submit' as const,
    platform: platform.id,
    description: `Submit to ${platform.name}${platform.hasCaptcha ? ' (may need CAPTCHA)' : ''}`,
    priority: (i < perDay ? 'high' : 'medium') as 'high' | 'medium',
    automatable: platform.automationLevel !== 'manual',
    delayMinutes: Math.floor(i / perDay) * 1440 + (i % perDay) * (60 + Math.floor(Math.random() * 120)),
  }));
}

/**
 * Filter platform IDs to only those selected AND matching the targets
 */
function filterPlatforms(selectedIds: string[], targetIds: string[]): string[] {
  return targetIds.filter(id => selectedIds.includes(id));
}

/**
 * Get the next actions the user should take right now
 */
export function getNextActions(plan: LaunchPlan, currentPhase: LaunchPhase): PhaseAction[] {
  const phase = plan.phases.find(p => p.id === currentPhase);
  if (!phase) return [];
  
  // Return critical and high priority actions first
  return phase.actions
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}

/**
 * Calculate estimated total reach based on platforms
 */
export function estimateReach(platformIds: string[]): {
  estimatedViews: string;
  estimatedClicks: string;
  bestCase: string;
} {
  const platformReach: Record<string, number> = {
    product_hunt: 50000,
    hackernews: 100000,
    reddit: 10000,
    twitter: 5000,
    linkedin_post: 3000,
    betalist: 15000,
    indie_hackers: 8000,
    saashub: 5000,
    alternativeto: 20000,
    crunchbase: 10000,
    g2: 30000,
    capterra: 25000,
    devhunt: 5000,
    microlaunch: 3000,
  };

  let totalViews = 0;
  for (const id of platformIds) {
    totalViews += platformReach[id] || 2000;
  }

  // Typical CTR: 1-3% from directories, 0.5-1% from social
  const clicks = Math.floor(totalViews * 0.015);
  const bestCaseViews = totalViews * 3; // If something goes viral

  return {
    estimatedViews: formatNumber(totalViews),
    estimatedClicks: formatNumber(clicks),
    bestCase: formatNumber(bestCaseViews),
  };
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}
