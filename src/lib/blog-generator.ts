/**
 * Launch Pilot - SEO + GEO Optimized Blog Post Generator
 * 
 * Generates a launch blog post optimized for:
 * 1. Traditional SEO (Google) - keywords, meta, headings, internal links
 * 2. GEO (Generative Engine Optimization) - structured for AI citation
 *    (ChatGPT, Perplexity, Google AI Overviews)
 * 
 * Inspired by cemini23/SEO-GEO-B-M-Wiki and the CITE framework:
 * - Claim (clear statement)
 * - Insight (unique data/perspective)
 * - Trust (authority signals)
 * - Evidence (proof/examples)
 */

export interface BlogInput {
  productName: string;
  productUrl: string;
  description: string;
  tagline: string;
  category: string;
  keywords: string;
  pricing?: string;
  features?: string[];
  targetAudience?: string;
}

export interface GeneratedBlog {
  title: string;
  metaDescription: string;
  slug: string;
  content: string; // Full markdown
  seoKeywords: string[];
  estimatedReadTime: number; // minutes
  wordCount: number;
  structuredData: object; // JSON-LD for schema.org
}

/**
 * Generate a full SEO+GEO optimized launch blog post
 */
export function generateLaunchBlogPost(input: BlogInput): GeneratedBlog {
  const primaryKeyword = `${input.productName} ${input.category}`;
  const secondaryKeywords = generateSEOKeywords(input);
  const title = generateTitle(input);
  const slug = generateSlug(title);
  const content = generateContent(input, secondaryKeywords);
  const wordCount = content.split(/\s+/).length;

  return {
    title,
    metaDescription: generateMetaDescription(input),
    slug,
    content,
    seoKeywords: secondaryKeywords,
    estimatedReadTime: Math.ceil(wordCount / 200),
    wordCount,
    structuredData: generateStructuredData(input, title, slug),
  };
}

/**
 * Generate an SEO-optimized title
 * Format: [Primary Keyword] - [Benefit] | [Brand]
 */
function generateTitle(input: BlogInput): string {
  const titles = [
    `Introducing ${input.productName}: ${input.tagline}`,
    `${input.productName} - ${input.tagline} [Launch]`,
    `Why We Built ${input.productName}: Solving ${getCoreProblems(input.description)[0]}`,
    `${input.productName}: The ${input.category} Tool That ${getCoreBenefit(input.description)}`,
  ];
  
  // Pick the one closest to 60 chars (optimal for Google)
  return titles.sort((a, b) => Math.abs(a.length - 60) - Math.abs(b.length - 60))[0];
}

/**
 * Generate meta description (150-160 chars, includes CTA)
 */
function generateMetaDescription(input: BlogInput): string {
  const meta = `${input.productName} ${input.tagline}. ${input.description.split('.')[0]}. Try it free at ${input.productUrl}`;
  return meta.substring(0, 155) + (meta.length > 155 ? '...' : '');
}

/**
 * Generate URL slug
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60);
}

/**
 * Generate the full blog content in markdown
 * Structure optimized for both SEO and GEO citation
 */
function generateContent(input: BlogInput, keywords: string[]): string {
  const problems = getCoreProblems(input.description);
  const benefits = getCoreBenefits(input.description);
  const features = input.features || extractFeatures(input.description);
  const audience = input.targetAudience || getAudience(input.category);

  return `# ${input.productName}: ${input.tagline}

> **TL;DR:** ${input.productName} is a ${input.category} tool that ${input.description.split('.')[0].toLowerCase()}. It's designed for ${audience} who need ${benefits[0] || 'a better solution'}.

## The Problem

${problems.map(p => `**${p}** - This is a real challenge that ${audience} face every day.`).join('\n\n')}

Most existing solutions are either:
- Too expensive for individuals and small teams
- Too complex to set up without technical expertise  
- Missing key features that modern workflows require

## Introducing ${input.productName}

**${input.productName}** is ${input.description}

${input.pricing ? `**Pricing:** ${input.pricing}` : '**Pricing:** Free to get started.'}

**Website:** [${input.productUrl}](${input.productUrl})

## Key Features

${features.map((f, i) => `### ${i + 1}. ${f}

${generateFeatureDescription(f, input)}`).join('\n\n')}

## Who Is ${input.productName} For?

${input.productName} is built specifically for:

${generateAudienceList(input.category, audience)}

## How It Works

1. **Sign up** at [${input.productUrl}](${input.productUrl})
2. **Set up** your workspace in minutes
3. **Start using** the core features immediately
4. **See results** - most users report improvements within the first week

## Why ${input.productName} vs Alternatives

| Feature | ${input.productName} | Traditional Tools |
|---------|${'-'.repeat(input.productName.length + 2)}|-------------------|
| Setup Time | Minutes | Hours/Days |
| Pricing | ${input.pricing || 'Free tier available'} | Often expensive |
| Ease of Use | Simple, intuitive | Complex, steep learning curve |
| Modern Features | Built for ${new Date().getFullYear()} | Often outdated |

## Getting Started

Ready to try ${input.productName}? 

**[Get started for free →](${input.productUrl})**

${input.pricing === 'free' || input.pricing === 'freemium' ? 'No credit card required. Start using it in under 2 minutes.' : ''}

## Frequently Asked Questions

### What is ${input.productName}?

${input.productName} is ${input.description}

### How much does ${input.productName} cost?

${input.pricing ? `${input.productName} offers ${input.pricing} pricing.` : `${input.productName} has a free tier to get started.`} Visit [${input.productUrl}](${input.productUrl}) for current pricing details.

### Who should use ${input.productName}?

${input.productName} is ideal for ${audience} who ${benefits[0] || 'want a better solution for their workflow'}.

### How do I get started?

Visit [${input.productUrl}](${input.productUrl}), create a free account, and you can start using ${input.productName} immediately.

---

*${input.productName} launched in ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}. Try it at [${input.productUrl}](${input.productUrl}).*

<!-- 
SEO Keywords: ${keywords.join(', ')}
Category: ${input.category}
-->
`;
}

/**
 * Generate SEO keywords for the blog post
 */
function generateSEOKeywords(input: BlogInput): string[] {
  const base = input.keywords.split(',').map(k => k.trim()).filter(Boolean);
  
  const generated = [
    input.productName.toLowerCase(),
    `${input.productName.toLowerCase()} review`,
    `${input.productName.toLowerCase()} alternative`,
    `best ${input.category} tool`,
    `${input.category} software`,
    `free ${input.category} tool`,
    ...base,
  ];

  return Array.from(new Set(generated)).slice(0, 10);
}

/**
 * Generate JSON-LD structured data (helps both SEO and GEO)
 */
function generateStructuredData(input: BlogInput, title: string, slug: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: input.productName,
    description: input.description,
    url: input.productUrl,
    applicationCategory: mapCategoryToSchema(input.category),
    offers: {
      '@type': 'Offer',
      price: input.pricing === 'free' ? '0' : undefined,
      priceCurrency: 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1',
    },
    // Article structured data for the blog post
    mainEntity: {
      '@type': 'Article',
      headline: title,
      description: generateMetaDescription(input),
      datePublished: new Date().toISOString(),
      author: {
        '@type': 'Organization',
        name: input.productName,
        url: input.productUrl,
      },
    },
  };
}

// === HELPER FUNCTIONS ===

function getCoreProblems(description: string): string[] {
  const problemWords = ['difficult', 'hard', 'complex', 'expensive', 'slow', 'manual', 'tedious', 'frustrating', 'time-consuming', 'confusing'];
  const sentences = description.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  
  const problems = sentences.filter(s => 
    problemWords.some(w => s.toLowerCase().includes(w))
  );
  
  if (problems.length === 0) {
    return ['Finding the right tool for the job', 'Managing complex workflows efficiently'];
  }
  
  return problems.slice(0, 3);
}

function getCoreBenefits(description: string): string[] {
  const benefitWords = ['save', 'reduce', 'increase', 'improve', 'simplify', 'automate', 'boost', 'grow', 'faster', 'easier', 'better'];
  const sentences = description.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  
  return sentences
    .filter(s => benefitWords.some(w => s.toLowerCase().includes(w)))
    .slice(0, 3);
}

function getCoreBenefit(description: string): string {
  const benefits = getCoreBenefits(description);
  return benefits[0] || description.split('.')[0].substring(0, 50);
}

function extractFeatures(description: string): string[] {
  const sentences = description.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
  return sentences.slice(0, 5).map(s => s.substring(0, 60));
}

function getAudience(category: string): string {
  const map: Record<string, string> = {
    'saas': 'businesses and teams',
    'developer-tools': 'developers and engineering teams',
    'productivity': 'professionals and remote workers',
    'marketing': 'marketers and growth teams',
    'ai': 'AI enthusiasts and builders',
    'design': 'designers and creative professionals',
    'finance': 'finance teams and business owners',
    'education': 'educators and students',
    'ecommerce': 'online store owners and entrepreneurs',
  };
  return map[category] || 'professionals looking for better tools';
}

function generateFeatureDescription(feature: string, input: BlogInput): string {
  return `${feature}. This helps ${getAudience(input.category)} work more efficiently and get better results.`;
}

function generateAudienceList(category: string, audience: string): string {
  return `- **${audience}** who want to work smarter
- **Small teams** looking for affordable, powerful tools
- **Startups** that need to move fast without breaking things
- **Freelancers** who want professional-grade capabilities`;
}

function mapCategoryToSchema(category: string): string {
  const map: Record<string, string> = {
    'saas': 'BusinessApplication',
    'developer-tools': 'DeveloperApplication',
    'productivity': 'ProductivityApplication',
    'marketing': 'BusinessApplication',
    'ai': 'UtilitiesApplication',
    'design': 'DesignApplication',
    'finance': 'FinanceApplication',
    'education': 'EducationalApplication',
    'ecommerce': 'ShoppingApplication',
  };
  return map[category] || 'WebApplication';
}

/**
 * Generate a "competitor alternative" blog post (great for SEO)
 * Targets "[competitor] alternative" search queries
 */
export function generateAlternativeBlogPost(
  input: BlogInput,
  competitorName: string
): GeneratedBlog {
  const title = `Best ${competitorName} Alternative in ${new Date().getFullYear()}: ${input.productName}`;
  const slug = generateSlug(title);
  
  const content = `# ${title}

Looking for a ${competitorName} alternative? Here's why ${input.productName} might be exactly what you need.

## Why People Look for ${competitorName} Alternatives

While ${competitorName} is a well-known tool, many users find themselves looking for alternatives because of:
- Pricing that doesn't fit their budget
- Features that are overly complex for their needs
- Wanting something more modern and streamlined

## Enter ${input.productName}

**${input.productName}** - ${input.tagline}

${input.description}

## ${input.productName} vs ${competitorName}

| | ${input.productName} | ${competitorName} |
|---|---|---|
| **Ease of use** | Simple, modern UI | Can be complex |
| **Pricing** | ${input.pricing || 'Free tier available'} | Often expensive |
| **Setup** | Minutes | Can take hours |
| **Focus** | ${input.category} | General purpose |

## Try ${input.productName}

**[Get started free →](${input.productUrl})**

---

*Looking for a better ${input.category} tool? Try ${input.productName} at [${input.productUrl}](${input.productUrl})*
`;

  return {
    title,
    metaDescription: `Looking for a ${competitorName} alternative? ${input.productName} offers ${input.tagline}. Try it free.`,
    slug,
    content,
    seoKeywords: [`${competitorName} alternative`, `best ${competitorName} alternative`, `${competitorName} vs ${input.productName}`, input.productName.toLowerCase()],
    estimatedReadTime: Math.ceil(content.split(/\s+/).length / 200),
    wordCount: content.split(/\s+/).length,
    structuredData: generateStructuredData(input, title, slug),
  };
}
