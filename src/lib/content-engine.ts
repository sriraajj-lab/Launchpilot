/**
 * Launch Pilot - AI Content Engine
 * 
 * Generates platform-specific marketing copy from a simple product description.
 * Inspired by coreyhaines31/marketingskills copywriting frameworks.
 * 
 * Core principle: Each platform has a different audience, tone, and format.
 * A Reddit post that works won't work on LinkedIn. This engine adapts automatically.
 */

export interface ProductInfo {
  name: string;
  url: string;
  description: string;
  tagline?: string;
  category?: string;
  keywords?: string;
  pricing?: string;
}

export interface GeneratedContent {
  platform: string;
  title?: string;
  body: string;
  hashtags?: string[];
  tips: string;
}

/**
 * Master content generator - produces platform-optimized copy for every channel
 */
export function generateAllContent(product: ProductInfo): Record<string, GeneratedContent> {
  return {
    // Social platforms
    reddit_sideproject: generateRedditPost(product, 'SideProject'),
    reddit_startups: generateRedditPost(product, 'startups'),
    reddit_indiehackers: generateRedditPost(product, 'indiehackers'),
    twitter_launch: generateTwitterLaunch(product),
    twitter_thread: generateTwitterThread(product),
    linkedin_post: generateLinkedInPost(product),
    hackernews: generateHackerNewsPost(product),
    
    // Directories
    product_hunt: generateProductHuntCopy(product),
    betalist: generateDirectoryShort(product, 'BetaList'),
    indie_hackers_product: generateIndieHackersProduct(product),
    
    // Generic
    directory_short: generateDirectoryShort(product, 'generic'),
    directory_long: generateDirectoryLong(product),
    elevator_pitch: generateElevatorPitch(product),
    
    // Outreach
    cold_dm: generateColdDM(product),
    community_intro: generateCommunityIntro(product),
  };
}

/**
 * Reddit post - storytelling format, anti-promotional, genuine
 * Framework: Problem → Why I built it → What it does → Ask for feedback
 */
function generateRedditPost(product: ProductInfo, subreddit: string): GeneratedContent {
  const problemHook = extractProblem(product.description);
  const solution = extractSolution(product.description);
  
  const subredditTone: Record<string, string> = {
    SideProject: 'casual, building-in-public vibe',
    startups: 'professional but approachable',
    indiehackers: 'indie maker community, revenue-focused',
  };

  const body = `I built ${product.name} - ${product.tagline || extractTagline(product.description)}

Hey r/${subreddit}! I've been working on something and wanted to share it with you all.

**The problem I kept running into:**
${problemHook}

**So I built ${product.name}:**
${solution}

**What it does:**
${bulletPoints(product.description)}

${product.pricing ? `**Pricing:** ${product.pricing}` : ''}

**Link:** ${product.url}

I'd genuinely love honest feedback - what's missing? What would make this actually useful for you? Happy to answer any questions.

${getSubredditCloser(subreddit)}`;

  return {
    platform: `reddit/r/${subreddit}`,
    title: `I built ${product.name} - ${product.tagline || extractTagline(product.description)}`,
    body,
    tips: `Tone: ${subredditTone[subreddit] || 'genuine, not salesy'}. Reply to EVERY comment. Don't just drop and leave.`,
  };
}

/**
 * Twitter/X launch tweet - punchy, visual, hook-driven
 * Framework: Hook → What → Why → CTA
 */
function generateTwitterLaunch(product: ProductInfo): GeneratedContent {
  const hook = generateHook(product);
  const body = `${hook}

Introducing ${product.name} 🚀

${product.tagline || extractTagline(product.description)}

${extractThreeFeatures(product.description)}

Try it free → ${product.url}

${generateHashtags(product).map(h => `#${h}`).join(' ')}`;

  return {
    platform: 'twitter',
    body: body.substring(0, 280),
    hashtags: generateHashtags(product),
    tips: 'Post between 8-10am EST for max visibility. Pin this tweet. Reply to yourself with more context.',
  };
}

/**
 * Twitter thread - narrative format for launch day
 * Framework: 1/Hook → 2/Problem → 3/Solution → 4/Features → 5/Social proof → 6/CTA
 */
function generateTwitterThread(product: ProductInfo): GeneratedContent {
  const body = `🧵 THREAD: I just launched ${product.name} and here's the full story:

1/ The Problem:
${extractProblem(product.description)}

Every existing solution was either too expensive, too complex, or just didn't work well.

2/ The Solution:
${product.name} - ${product.tagline || extractTagline(product.description)}

${extractSolution(product.description)}

3/ Key Features:
${bulletPoints(product.description)}

4/ Who it's for:
→ ${getTargetAudience(product)}

5/ What's next:
I'm building this in public. Reply or DM me what features you'd want most.

6/ Try it:
${product.url}

RT if you know someone who'd find this useful 🙏

${generateHashtags(product).slice(0, 3).map(h => `#${h}`).join(' ')}`;

  return {
    platform: 'twitter_thread',
    body,
    hashtags: generateHashtags(product),
    tips: 'Post each tweet 1-2 mins apart. First tweet is everything - make the hook irresistible.',
  };
}

/**
 * LinkedIn post - professional, value-driven, engagement-optimized
 * Framework: Hook line → Story → Value → CTA → Hashtags
 */
function generateLinkedInPost(product: ProductInfo): GeneratedContent {
  const body = `I just launched something I've been working on for a while.

${product.name}: ${product.tagline || extractTagline(product.description)}

Here's why I built it:

${extractProblem(product.description)}

The existing tools were either:
→ Too expensive for small teams
→ Too complex to set up
→ Missing key features

So I built ${product.name}.

${extractSolution(product.description)}

Who is it for?
${getTargetAudience(product)}

I'd love to connect with others in this space.

Drop a comment if you've experienced this problem too - I want to hear your take.

${product.url}

#startup #launch ${generateHashtags(product).slice(0, 3).map(h => `#${h}`).join(' ')}`;

  return {
    platform: 'linkedin',
    body,
    hashtags: ['startup', 'launch', ...generateHashtags(product).slice(0, 3)],
    tips: 'LinkedIn rewards early engagement. Reply to every comment in first hour. No external links in comments (kills reach). Put link in first comment instead.',
  };
}

/**
 * Hacker News - minimal, technical, no marketing speak
 * Framework: "Show HN: [Name] – [Technical description]"
 */
function generateHackerNewsPost(product: ProductInfo): GeneratedContent {
  // HN titles must be concise and technical
  const title = `Show HN: ${product.name} – ${extractTagline(product.description)}`;
  
  const body = `Hi HN, I built ${product.name} because ${extractProblem(product.description).toLowerCase()}

${extractSolution(product.description)}

Would love technical feedback on the approach. What would you do differently?

${product.url}`;

  return {
    platform: 'hackernews',
    title: title.substring(0, 80),
    body,
    tips: 'NO marketing language. Lead with technical details. HN hates self-promotion - frame as "seeking feedback". Best time: weekday mornings EST.',
  };
}

/**
 * Product Hunt - structured with clear tagline and maker comment
 */
function generateProductHuntCopy(product: ProductInfo): GeneratedContent {
  const tagline = (product.tagline || extractTagline(product.description)).substring(0, 60);
  
  const body = `**Tagline:** ${tagline}

**First Comment (Maker):**
Hey Product Hunt! 👋

I'm excited to share ${product.name} with you today.

**Why I built this:**
${extractProblem(product.description)}

**What it does:**
${bulletPoints(product.description)}

**What's next:**
I'm actively building based on user feedback. Would love to hear what features would make this a must-have for you.

Thanks for checking it out! Happy to answer any questions below. 🙏`;

  return {
    platform: 'product_hunt',
    title: tagline,
    body,
    tips: 'Launch Tuesday-Thursday. Schedule for 12:01 AM PST. Prepare a demo GIF. Reply to every comment. Ask your network to support (not upvote).',
  };
}

/**
 * Indie Hackers product page - revenue/growth focused
 */
function generateIndieHackersProduct(product: ProductInfo): GeneratedContent {
  const body = `**${product.name}** - ${product.tagline || extractTagline(product.description)}

**What is it?**
${product.description}

**Who is it for?**
${getTargetAudience(product)}

**How does it make money?**
${product.pricing || 'Free to start, paid plans for teams'}

**Current status:**
Just launched! Looking for early users and feedback.

**Link:** ${product.url}`;

  return {
    platform: 'indie_hackers',
    body,
    tips: 'IH audience cares about revenue and transparency. Share numbers if you can. Engage in the community before posting.',
  };
}

/**
 * Directory short description (200 chars) - for most directories
 */
function generateDirectoryShort(product: ProductInfo, directory: string): GeneratedContent {
  const short = `${product.name} - ${product.tagline || extractTagline(product.description)}. ${extractSolution(product.description).split('.')[0]}.`;
  
  return {
    platform: directory,
    body: short.substring(0, 200),
    tips: 'Keep under 200 chars. Lead with what it does, not what it is.',
  };
}

/**
 * Directory long description (500+ chars) - for directories allowing detail
 */
function generateDirectoryLong(product: ProductInfo): GeneratedContent {
  const body = `${product.name} - ${product.tagline || extractTagline(product.description)}

${product.description}

Key Features:
${bulletPoints(product.description)}

Who is it for?
${getTargetAudience(product)}

${product.pricing ? `Pricing: ${product.pricing}` : 'Free to get started.'}

Get started at ${product.url}`;

  return {
    platform: 'directory_long',
    body,
    tips: 'Focus on benefits over features. Include a clear CTA.',
  };
}

/**
 * Elevator pitch - 30 second version for any context
 */
function generateElevatorPitch(product: ProductInfo): GeneratedContent {
  const body = `${product.name} helps ${getTargetAudience(product).toLowerCase()} ${extractCoreBenefit(product.description)}. ${extractSolution(product.description).split('.')[0]}. Try it at ${product.url}`;

  return {
    platform: 'elevator_pitch',
    body: body.substring(0, 300),
    tips: 'Use this for DMs, intros, and any quick-pitch situation.',
  };
}

/**
 * Cold DM - personalized outreach message
 * Framework: Compliment → Problem → Solution → Soft CTA
 */
function generateColdDM(product: ProductInfo): GeneratedContent {
  const body = `Hey! 👋

I noticed you work in the ${product.category || 'tech'} space and thought this might be relevant.

I recently built ${product.name} - ${product.tagline || extractTagline(product.description)}.

It helps with: ${extractCoreBenefit(product.description)}

Would love your thoughts if you have 2 mins: ${product.url}

No pressure at all - just thought it might be useful for what you're working on!`;

  return {
    platform: 'cold_dm',
    body,
    tips: 'ALWAYS personalize the first line. Reference something specific about the person. Keep under 100 words. One clear CTA.',
  };
}

/**
 * Community introduction post - for Slack groups, Discord servers, FB groups
 */
function generateCommunityIntro(product: ProductInfo): GeneratedContent {
  const body = `Hey everyone! 👋 New here.

I've been building ${product.name} - ${product.tagline || extractTagline(product.description)}.

Quick background: ${extractProblem(product.description)}

So I built a solution: ${extractSolution(product.description).split('.')[0]}.

Would love to connect with others working on similar problems. Anyone else dealing with this?

Happy to share more details if anyone's interested: ${product.url}`;

  return {
    platform: 'community',
    body,
    tips: 'Introduce yourself FIRST. Provide value before promoting. Ask a question to encourage replies.',
  };
}

// === HELPER FUNCTIONS ===

/**
 * Extract the problem statement from a description
 */
function extractProblem(description: string): string {
  // Look for problem indicators
  const sentences = description.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  
  // Try to find problem-oriented sentences
  const problemIndicators = ['frustrat', 'problem', 'difficult', 'hard to', 'expensive', 'complex', 'slow', 'manual', 'tedious', 'annoying', 'lack', 'without', 'need', 'struggle'];
  
  for (const sentence of sentences) {
    if (problemIndicators.some(ind => sentence.toLowerCase().includes(ind))) {
      return sentence;
    }
  }
  
  // Default: invert the solution into a problem
  const firstSentence = sentences[0] || description.substring(0, 100);
  return `Most people struggle with ${firstSentence.toLowerCase().replace(/^(a|an|the)\s+/i, '')} - existing solutions are either too complex or too expensive`;
}

/**
 * Extract the solution/value prop from description
 */
function extractSolution(description: string): string {
  const sentences = description.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  
  const solutionIndicators = ['helps', 'enables', 'makes', 'allows', 'simplif', 'automat', 'provides', 'gives', 'offers', 'built for', 'designed to'];
  
  for (const sentence of sentences) {
    if (solutionIndicators.some(ind => sentence.toLowerCase().includes(ind))) {
      return sentence;
    }
  }
  
  return sentences[0] || description.substring(0, 150);
}

/**
 * Generate a tagline from description (first meaningful clause, max 60 chars)
 */
function extractTagline(description: string): string {
  const firstSentence = description.split(/[.!?]/)[0].trim();
  if (firstSentence.length <= 60) return firstSentence;
  
  // Try to cut at a natural break
  const shortened = firstSentence.substring(0, 57);
  const lastSpace = shortened.lastIndexOf(' ');
  return shortened.substring(0, lastSpace) + '...';
}

/**
 * Extract core benefit as a verb phrase
 */
function extractCoreBenefit(description: string): string {
  const verbs = ['save time', 'reduce cost', 'increase', 'improve', 'simplify', 'automate', 'streamline', 'boost', 'grow', 'scale', 'manage', 'track', 'monitor', 'build', 'create', 'generate'];
  
  const lower = description.toLowerCase();
  for (const verb of verbs) {
    const idx = lower.indexOf(verb);
    if (idx !== -1) {
      const end = lower.indexOf('.', idx);
      return description.substring(idx, end !== -1 ? end : idx + 60).trim();
    }
  }
  
  return description.split('.')[0].substring(0, 80);
}

/**
 * Convert description into bullet points
 */
function bulletPoints(description: string): string {
  const sentences = description.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
  const points = sentences.slice(0, 4).map(s => `• ${s}`);
  
  if (points.length < 2) {
    // Generate from keywords
    const words = description.split(' ').filter(w => w.length > 4);
    const uniqueTopics = [...new Set(words)].slice(0, 4);
    return uniqueTopics.map(w => `• ${w.charAt(0).toUpperCase() + w.slice(1)}-powered solution`).join('\n');
  }
  
  return points.join('\n');
}

/**
 * Generate a hook/attention-grabber
 */
function generateHook(product: ProductInfo): string {
  const hooks = [
    `Tired of ${extractProblem(product.description).toLowerCase().substring(0, 50)}?`,
    `I spent weeks building this so you don't have to:`,
    `The ${product.category || 'tool'} space is broken. Here's my fix:`,
    `What if you could ${extractCoreBenefit(product.description)} in minutes?`,
    `Just shipped something I'm really proud of:`,
  ];
  
  return hooks[Math.floor(Math.random() * hooks.length)];
}

/**
 * Get target audience description
 */
function getTargetAudience(product: ProductInfo): string {
  const category = product.category?.toLowerCase() || '';
  
  const audienceMap: Record<string, string> = {
    'saas': 'SaaS founders, product teams, and startup operators',
    'developer-tools': 'developers, engineering teams, and technical leaders',
    'productivity': 'busy professionals, remote teams, and productivity enthusiasts',
    'marketing': 'marketers, growth teams, and content creators',
    'ai': 'AI builders, ML engineers, and teams integrating AI into their workflows',
    'design': 'designers, creative teams, and product managers',
    'finance': 'finance teams, accountants, and business owners managing budgets',
    'education': 'educators, students, and learning platforms',
    'ecommerce': 'e-commerce store owners, dropshippers, and online sellers',
  };

  return audienceMap[category] || 'professionals and teams looking for a better way to work';
}

/**
 * Generate relevant hashtags
 */
function generateHashtags(product: ProductInfo): string[] {
  const base = ['buildinpublic', 'launch', 'startup'];
  
  const categoryTags: Record<string, string[]> = {
    'saas': ['saas', 'b2b', 'startuplife'],
    'developer-tools': ['devtools', 'coding', 'webdev'],
    'productivity': ['productivity', 'remotework', 'efficiency'],
    'marketing': ['marketing', 'growth', 'digitalmarketing'],
    'ai': ['ai', 'machinelearning', 'generativeai'],
    'design': ['uidesign', 'ux', 'creative'],
    'finance': ['fintech', 'finance', 'money'],
    'education': ['edtech', 'learning', 'education'],
    'ecommerce': ['ecommerce', 'shopify', 'onlinebusiness'],
  };

  const category = product.category?.toLowerCase() || '';
  const extra = categoryTags[category] || ['tech', 'innovation'];

  return [...base, ...extra].slice(0, 6);
}

/**
 * Get subreddit-specific closer
 */
function getSubredditCloser(subreddit: string): string {
  const closers: Record<string, string> = {
    SideProject: "Would love to hear what you think! This is still early and I'm iterating fast.",
    startups: "Looking for honest feedback from this community. What would you change?",
    indiehackers: "If anyone's building in a similar space, would love to connect and share learnings.",
  };
  return closers[subreddit] || "Appreciate any feedback - positive or critical!";
}
