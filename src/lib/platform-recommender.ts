/**
 * Launch Pilot - Platform & Community Recommendation Engine
 * 
 * Auto-detects which platforms, subreddits, and communities are
 * most relevant for a specific product based on its category,
 * keywords, and description.
 * 
 * Goal: Maximize eyeballs by targeting the RIGHT audiences.
 */

export interface Recommendation {
  platformId: string;
  name: string;
  reason: string;
  estimatedReach: string;
  priority: 'must' | 'should' | 'could';
  type: 'directory' | 'social' | 'community' | 'review';
}

export interface SubredditRecommendation {
  name: string;
  subscribers: string;
  reason: string;
  postType: 'text' | 'link';
  selfPromoRules: string;
  priority: 'must' | 'should' | 'could';
}

export interface CommunityRecommendation {
  name: string;
  platform: string; // 'slack' | 'discord' | 'facebook_group' | 'forum'
  url?: string;
  reason: string;
  memberCount?: string;
}

/**
 * Main recommendation function - takes product info, returns best platforms
 */
export function recommendPlatforms(
  category: string,
  keywords: string,
  description: string,
  pricing?: string
): {
  platforms: Recommendation[];
  subreddits: SubredditRecommendation[];
  communities: CommunityRecommendation[];
} {
  const lower = description.toLowerCase();
  const keywordList = keywords.toLowerCase().split(',').map(k => k.trim());
  const cat = category.toLowerCase();

  return {
    platforms: getRecommendedPlatforms(cat, keywordList, lower, pricing),
    subreddits: getRecommendedSubreddits(cat, keywordList, lower),
    communities: getRecommendedCommunities(cat, keywordList, lower),
  };
}

/**
 * Recommend directory/listing platforms based on product characteristics
 */
function getRecommendedPlatforms(
  category: string,
  keywords: string[],
  description: string,
  pricing?: string
): Recommendation[] {
  const recs: Recommendation[] = [];

  // === UNIVERSAL (everyone should submit to these) ===
  const universalPlatforms: Recommendation[] = [
    { platformId: 'product_hunt', name: 'Product Hunt', reason: 'Highest traffic for new launches. Must-have for any product.', estimatedReach: '50K+ views', priority: 'must', type: 'directory' },
    { platformId: 'hackernews', name: 'Hacker News', reason: 'Tech-savvy audience. Can go viral with right title. Free.', estimatedReach: '100K+ if front page', priority: 'must', type: 'social' },
    { platformId: 'betalist', name: 'BetaList', reason: 'Early adopter audience actively looking for new tools.', estimatedReach: '15K+', priority: 'must', type: 'directory' },
    { platformId: 'indie_hackers', name: 'Indie Hackers', reason: 'Supportive maker community. Great for feedback + early users.', estimatedReach: '8K+', priority: 'must', type: 'directory' },
  ];
  recs.push(...universalPlatforms);

  // === AI TOOLS ===
  if (isAI(category, keywords, description)) {
    recs.push(
      { platformId: 'toolify', name: 'Toolify.ai', reason: 'Top AI tool directory. High traffic from people searching for AI solutions.', estimatedReach: '20K+', priority: 'must', type: 'directory' },
      { platformId: 'there_is_an_ai', name: 'There Is An AI For That', reason: 'Massive AI directory. Gets cited by AI search engines.', estimatedReach: '30K+', priority: 'must', type: 'directory' },
      { platformId: 'futurepedia', name: 'Futurepedia', reason: 'Curated AI directory with good SEO juice.', estimatedReach: '15K+', priority: 'should', type: 'directory' },
    );
  }

  // === DEVELOPER TOOLS ===
  if (isDeveloperTool(category, keywords, description)) {
    recs.push(
      { platformId: 'devhunt', name: 'DevHunt', reason: 'Product Hunt alternative specifically for developer tools.', estimatedReach: '5K+', priority: 'must', type: 'directory' },
      { platformId: 'stackshare', name: 'StackShare', reason: 'Developers discover tools here when building their stack.', estimatedReach: '10K+', priority: 'should', type: 'directory' },
    );
  }

  // === B2B / SAAS ===
  if (isSaaS(category, keywords, description)) {
    recs.push(
      { platformId: 'g2', name: 'G2', reason: 'Buyers check G2 before purchasing. Essential for B2B credibility.', estimatedReach: '30K+', priority: 'must', type: 'review' },
      { platformId: 'capterra', name: 'Capterra', reason: 'Major software comparison site. Drives purchase decisions.', estimatedReach: '25K+', priority: 'should', type: 'review' },
      { platformId: 'saashub', name: 'SaaSHub', reason: 'Independent SaaS marketplace. Good backlink for SEO.', estimatedReach: '5K+', priority: 'should', type: 'directory' },
      { platformId: 'crunchbase', name: 'Crunchbase', reason: 'Adds legitimacy. Investors and press check here.', estimatedReach: '10K+', priority: 'should', type: 'directory' },
    );
  }

  // === STARTUP / INDIE ===
  recs.push(
    { platformId: 'startup_base', name: 'StartupBase', reason: 'Quick submission, good backlink, startup-focused audience.', estimatedReach: '3K+', priority: 'should', type: 'directory' },
    { platformId: 'launching_next', name: 'Launching Next', reason: 'Focused on new launches. Easy submission.', estimatedReach: '3K+', priority: 'should', type: 'directory' },
    { platformId: 'microlaunch', name: 'MicroLaunch', reason: 'Supportive micro-SaaS community.', estimatedReach: '2K+', priority: 'could', type: 'directory' },
    { platformId: 'uneed', name: 'Uneed', reason: 'Curated directory with clean UI.', estimatedReach: '2K+', priority: 'could', type: 'directory' },
  );

  // === SOCIAL ALWAYS ===
  recs.push(
    { platformId: 'twitter', name: 'Twitter / X', reason: 'Build-in-public audience. Launch tweets can go viral.', estimatedReach: '5K-50K+', priority: 'must', type: 'social' },
    { platformId: 'linkedin_post', name: 'LinkedIn', reason: 'Professional audience. Great for B2B and credibility.', estimatedReach: '3K-10K+', priority: 'should', type: 'social' },
    { platformId: 'reddit', name: 'Reddit', reason: 'Massive reach if you find the right subreddit.', estimatedReach: '10K-100K+', priority: 'must', type: 'social' },
  );

  // Deduplicate
  const seen = new Set<string>();
  return recs.filter(r => {
    if (seen.has(r.platformId)) return false;
    seen.add(r.platformId);
    return true;
  });
}

/**
 * Recommend subreddits based on product category and keywords
 */
function getRecommendedSubreddits(
  category: string,
  keywords: string[],
  description: string
): SubredditRecommendation[] {
  const recs: SubredditRecommendation[] = [];

  // Universal launch subreddits
  recs.push(
    { name: 'SideProject', subscribers: '130K+', reason: 'Most launch-friendly subreddit. Self-promo welcome.', postType: 'text', selfPromoRules: 'Self-promotion allowed, be genuine', priority: 'must' },
    { name: 'startups', subscribers: '1.2M+', reason: 'Large startup community. Share your story.', postType: 'text', selfPromoRules: 'Self-promo in designated threads', priority: 'must' },
    { name: 'indiehackers', subscribers: '50K+', reason: 'Indie makers who support each other.', postType: 'text', selfPromoRules: 'Show work, not ads', priority: 'must' },
    { name: 'alphaandbetausers', subscribers: '45K+', reason: 'Literally for sharing beta products.', postType: 'text', selfPromoRules: 'Made for this purpose', priority: 'must' },
  );

  // AI tools
  if (isAI(category, keywords, description)) {
    recs.push(
      { name: 'artificial', subscribers: '200K+', reason: 'AI enthusiasts actively looking for tools.', postType: 'text', selfPromoRules: 'Share value first', priority: 'should' },
      { name: 'ChatGPT', subscribers: '5M+', reason: 'If your tool relates to GPT/AI chat.', postType: 'text', selfPromoRules: 'No direct promo, share as resource', priority: 'could' },
      { name: 'MachineLearning', subscribers: '2.5M+', reason: 'Technical ML audience.', postType: 'link', selfPromoRules: 'Must be technical/research focused', priority: 'could' },
    );
  }

  // Developer tools
  if (isDeveloperTool(category, keywords, description)) {
    recs.push(
      { name: 'webdev', subscribers: '1M+', reason: 'Web developers looking for tools.', postType: 'text', selfPromoRules: 'Showoff Saturday thread', priority: 'should' },
      { name: 'programming', subscribers: '5M+', reason: 'Massive programming community.', postType: 'link', selfPromoRules: 'No self-promo, share as interesting project', priority: 'could' },
      { name: 'selfhosted', subscribers: '300K+', reason: 'If self-hostable, this crowd loves it.', postType: 'text', selfPromoRules: 'Open source/self-hosted preferred', priority: 'should' },
    );
  }

  // Productivity
  if (isProductivity(category, keywords, description)) {
    recs.push(
      { name: 'productivity', subscribers: '1.5M+', reason: 'People actively looking for tools to improve workflow.', postType: 'text', selfPromoRules: 'Self-promo Saturday', priority: 'should' },
      { name: 'Notion', subscribers: '200K+', reason: 'If related to productivity/notes.', postType: 'text', selfPromoRules: 'Share templates/tools', priority: 'could' },
      { name: 'RemoteWork', subscribers: '100K+', reason: 'Remote workers seeking tools.', postType: 'text', selfPromoRules: 'Helpful tools welcome', priority: 'could' },
    );
  }

  // Marketing
  if (isMarketing(category, keywords, description)) {
    recs.push(
      { name: 'marketing', subscribers: '400K+', reason: 'Marketers looking for tools.', postType: 'text', selfPromoRules: 'Limited self-promo', priority: 'should' },
      { name: 'SEO', subscribers: '200K+', reason: 'If SEO-related tool.', postType: 'text', selfPromoRules: 'Tools welcome if helpful', priority: 'should' },
      { name: 'Entrepreneur', subscribers: '2M+', reason: 'Large business audience.', postType: 'text', selfPromoRules: 'Value-first approach', priority: 'could' },
      { name: 'smallbusiness', subscribers: '500K+', reason: 'Small business owners needing tools.', postType: 'text', selfPromoRules: 'Promote in weekly thread', priority: 'could' },
    );
  }

  // Design
  if (isDesign(category, keywords, description)) {
    recs.push(
      { name: 'UI_Design', subscribers: '150K+', reason: 'Designers looking for tools.', postType: 'link', selfPromoRules: 'Share tools/resources', priority: 'should' },
      { name: 'web_design', subscribers: '800K+', reason: 'Web designers.', postType: 'link', selfPromoRules: 'Feedback Friday', priority: 'could' },
    );
  }

  // Additional universal
  recs.push(
    { name: 'IMadeThis', subscribers: '30K+', reason: 'Share what you made. Very accepting.', postType: 'text', selfPromoRules: 'Made for sharing creations', priority: 'should' },
    { name: 'roastmystartup', subscribers: '20K+', reason: 'Get brutal honest feedback.', postType: 'text', selfPromoRules: 'Specifically for critique', priority: 'could' },
  );

  return recs;
}

/**
 * Recommend online communities (Slack, Discord, FB groups, forums)
 */
function getRecommendedCommunities(
  category: string,
  keywords: string[],
  description: string
): CommunityRecommendation[] {
  const recs: CommunityRecommendation[] = [];

  // Universal
  recs.push(
    { name: 'Indie Hackers Community', platform: 'forum', reason: 'Active maker community. Post in "Landing Page Feedback" and "Show IH".', memberCount: '100K+' },
    { name: 'Product Hunt Discussions', platform: 'forum', reason: 'Engage before launch day. Build relationships with hunters.', memberCount: '50K+' },
  );

  // AI
  if (isAI(category, keywords, description)) {
    recs.push(
      { name: 'AI Builders', platform: 'discord', reason: 'Active Discord of people building with AI.', memberCount: '20K+' },
      { name: 'MLOps Community', platform: 'slack', reason: 'If ML/AI infrastructure related.', memberCount: '15K+' },
    );
  }

  // Dev tools
  if (isDeveloperTool(category, keywords, description)) {
    recs.push(
      { name: 'Dev.to', platform: 'forum', reason: 'Write a launch post. Developer blogging platform with built-in audience.', memberCount: '1M+' },
      { name: 'Hacker Noon', platform: 'forum', reason: 'Publish your launch story as an article.', memberCount: '500K+' },
    );
  }

  // SaaS / Startup
  if (isSaaS(category, keywords, description)) {
    recs.push(
      { name: 'SaaS Growth Hacks (FB Group)', platform: 'facebook_group', reason: 'Active group of SaaS founders sharing tools.', memberCount: '30K+' },
      { name: 'MicroConf Connect', platform: 'slack', reason: 'High-quality SaaS founder community.', memberCount: '5K+' },
    );
  }

  // Marketing
  if (isMarketing(category, keywords, description)) {
    recs.push(
      { name: 'Growth Hackers', platform: 'forum', url: 'https://growthhackers.com', reason: 'Share growth experiments. Active marketing community.', memberCount: '100K+' },
      { name: 'Traffic Think Tank', platform: 'slack', reason: 'Premium SEO/marketing community.', memberCount: '3K+' },
    );
  }

  // Universal social
  recs.push(
    { name: 'Twitter #buildinpublic', platform: 'twitter', reason: 'Engage with the build-in-public community. Very supportive of launches.', memberCount: '500K+ followers' },
    { name: 'LinkedIn Startup Groups', platform: 'linkedin', reason: 'Post in relevant LinkedIn groups for professional reach.', memberCount: 'varies' },
  );

  return recs;
}

// === CATEGORY DETECTION HELPERS ===

function isAI(category: string, keywords: string[], description: string): boolean {
  return category === 'ai' || 
    keywords.some(k => ['ai', 'gpt', 'llm', 'machine learning', 'ml', 'neural', 'chatbot', 'generative'].includes(k)) ||
    /\b(ai|artificial intelligence|machine learning|gpt|llm|neural|deep learning|chatbot)\b/i.test(description);
}

function isDeveloperTool(category: string, keywords: string[], description: string): boolean {
  return category === 'developer-tools' || 
    keywords.some(k => ['developer', 'api', 'code', 'dev', 'programming', 'cli', 'sdk', 'open source'].includes(k)) ||
    /\b(developer|api|code|programming|cli|sdk|devops|github|git|deploy)\b/i.test(description);
}

function isSaaS(category: string, keywords: string[], description: string): boolean {
  return category === 'saas' || 
    keywords.some(k => ['saas', 'platform', 'dashboard', 'b2b', 'subscription', 'cloud'].includes(k)) ||
    /\b(saas|platform|dashboard|subscription|cloud|b2b|team|collaboration)\b/i.test(description);
}

function isProductivity(category: string, keywords: string[], description: string): boolean {
  return category === 'productivity' || 
    keywords.some(k => ['productivity', 'workflow', 'automate', 'task', 'project management', 'time'].includes(k)) ||
    /\b(productivity|workflow|automate|task|schedule|organize|efficiency)\b/i.test(description);
}

function isMarketing(category: string, keywords: string[], description: string): boolean {
  return category === 'marketing' || 
    keywords.some(k => ['marketing', 'seo', 'content', 'social media', 'email', 'growth', 'analytics'].includes(k)) ||
    /\b(marketing|seo|content|social media|email campaign|growth|analytics|ads)\b/i.test(description);
}

function isDesign(category: string, keywords: string[], description: string): boolean {
  return category === 'design' || 
    keywords.some(k => ['design', 'ui', 'ux', 'figma', 'creative', 'graphics'].includes(k)) ||
    /\b(design|ui|ux|figma|creative|graphic|visual|prototype|wireframe)\b/i.test(description);
}
