import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireAuth, unauthorizedResponse, errorResponse, successResponse } from '@/lib/auth-helpers';
import { addCampaignToQueue } from '@/lib/queue/producer';
import { getFullyAutomatedPlatforms, getSemiAutomatedPlatforms } from '@/lib/platforms/registry';

const launchSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
});

/**
 * POST /api/launch
 * 
 * The ONE endpoint. Takes a URL + name + description,
 * auto-creates everything, and starts submitting to all relevant platforms.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { url, name, description } = launchSchema.parse(body);

    // Auto-generate tagline from description (first sentence, max 60 chars)
    const tagline = description.split(/[.!?]/)[0].trim().substring(0, 60);

    // Auto-detect category from description keywords
    const category = detectCategory(description);

    // Auto-extract keywords
    const keywords = extractKeywords(name, description);

    // Step 1: Create product automatically
    const product = await prisma.product.create({
      data: {
        userId: user.id,
        name,
        tagline,
        description,
        url,
        category,
        keywords,
        pricing: 'free', // default
      },
    });

    // Step 2: Select ALL platforms (fully automated + semi-automated)
    const fullAuto = getFullyAutomatedPlatforms();
    const semiAuto = getSemiAutomatedPlatforms();
    const allPlatforms = [...fullAuto, ...semiAuto];
    const platformIds = allPlatforms.map(p => p.id);

    // Step 3: Create campaign with submissions for every platform
    const campaign = await prisma.campaign.create({
      data: {
        userId: user.id,
        productId: product.id,
        name: `${name} - Auto Launch`,
        status: 'queued',
        targetPlatforms: JSON.stringify(platformIds),
        delayMinutes: 3,
        startedAt: new Date(),
        submissions: {
          create: allPlatforms.map((platform, index) => ({
            platform: platform.id,
            platformName: platform.name,
            status: 'pending',
          })),
        },
      },
      include: {
        submissions: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Step 4: Queue it for processing
    await addCampaignToQueue(campaign.id, user.id);

    return successResponse({
      campaignId: campaign.id,
      productId: product.id,
      status: 'running',
      platformCount: allPlatforms.length,
      submissions: campaign.submissions,
      message: `Launching "${name}" to ${allPlatforms.length} platforms!`,
    }, 201);

  } catch (error: any) {
    if (error.message === 'Unauthorized') return unauthorizedResponse();
    if (error instanceof z.ZodError) return errorResponse(error.errors[0].message);
    return errorResponse(error.message, 500);
  }
}

/**
 * Auto-detect category from description text
 */
function detectCategory(description: string): string {
  const text = description.toLowerCase();
  
  const categories: Record<string, string[]> = {
    'ai': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'gpt', 'llm', 'neural', 'deep learning'],
    'developer-tools': ['developer', 'api', 'code', 'programming', 'github', 'devops', 'cli', 'sdk', 'framework'],
    'productivity': ['productivity', 'workflow', 'automate', 'organize', 'task', 'time', 'schedule', 'manage'],
    'marketing': ['marketing', 'seo', 'social media', 'campaign', 'email', 'content', 'analytics', 'growth'],
    'design': ['design', 'ui', 'ux', 'figma', 'creative', 'graphics', 'visual', 'image'],
    'saas': ['saas', 'platform', 'cloud', 'subscription', 'dashboard', 'tool', 'service', 'software'],
    'finance': ['finance', 'payment', 'invoice', 'accounting', 'money', 'budget', 'crypto', 'trading'],
    'education': ['learn', 'education', 'course', 'tutorial', 'training', 'teach', 'student'],
    'ecommerce': ['ecommerce', 'shop', 'store', 'sell', 'product', 'cart', 'marketplace'],
    'health': ['health', 'fitness', 'medical', 'wellness', 'mental', 'therapy', 'diet'],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => text.includes(kw))) {
      return category;
    }
  }

  return 'saas'; // default
}

/**
 * Auto-extract keywords from name and description
 */
function extractKeywords(name: string, description: string): string {
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either', 'neither', 'each', 'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'because', 'this', 'that', 'these', 'those', 'it', 'its', 'you', 'your', 'we', 'our', 'they', 'their', 'what', 'which', 'who', 'whom', 'how', 'when', 'where', 'why']);
  
  const text = `${name} ${description}`.toLowerCase();
  const words = text.match(/\b[a-z]{3,}\b/g) || [];
  
  // Count word frequency, skip stop words
  const freq = new Map<string, number>();
  for (const word of words) {
    if (!stopWords.has(word)) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }
  }

  // Get top keywords by frequency
  const sorted = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
  const topKeywords = sorted.slice(0, 8).map(([word]) => word);

  return topKeywords.join(', ');
}
