/**
 * Launch Pilot - Default Content Templates
 * 
 * Pre-built templates for various platforms with {{variable}} placeholders.
 * Variables: {{name}}, {{tagline}}, {{description}}, {{url}}, {{category}}, {{keywords}}, {{pricing}}
 */

export interface ContentTemplate {
  id: string;
  name: string;
  platform: string;
  type: 'post' | 'dm' | 'description' | 'bio' | 'thread' | 'comment';
  content: string;
  variables: string[];
  tips?: string;
}

export const DEFAULT_TEMPLATES: ContentTemplate[] = [
  // === REDDIT TEMPLATES ===
  {
    id: 'reddit_launch_post',
    name: 'Reddit Launch Post',
    platform: 'reddit',
    type: 'post',
    content: `I built {{name}} - {{tagline}}

Hey everyone! I've been working on {{name}} and wanted to share it with this community.

**What is it?**
{{description}}

**Why I built it:**
I was frustrated with existing solutions that were either too expensive or too complex. So I built something simpler.

**Key features:**
- {{tagline}}
- Easy to get started
- {{pricing}}

**Link:** {{url}}

I'd love your honest feedback - what would make this more useful for you? Happy to answer any questions!`,
    variables: ['name', 'tagline', 'description', 'url', 'pricing'],
    tips: 'Customize for each subreddit. Be genuine, not salesy. Engage with every comment.',
  },
  {
    id: 'reddit_show_hn_style',
    name: 'Reddit Show-style Post',
    platform: 'reddit',
    type: 'post',
    content: `Show: {{name}} - {{tagline}}

{{url}}

Quick background: I built this because {{description}}

Tech stack: [mention your stack here]

Would love feedback from the community. What features would you want to see next?`,
    variables: ['name', 'tagline', 'url', 'description'],
    tips: 'Works well in r/SideProject, r/startups, r/indiehackers',
  },

  // === TWITTER/X TEMPLATES ===
  {
    id: 'twitter_launch_tweet',
    name: 'Twitter Launch Tweet',
    platform: 'twitter',
    type: 'post',
    content: `Launching today: {{name}}

{{tagline}}

After weeks of building, it's finally live.

Check it out: {{url}}

#buildinpublic #launch #{{category}}`,
    variables: ['name', 'tagline', 'url', 'category'],
    tips: 'Keep it under 280 chars. Add relevant hashtags.',
  },
  {
    id: 'twitter_launch_thread',
    name: 'Twitter Launch Thread',
    platform: 'twitter',
    type: 'thread',
    content: `THREAD: I just launched {{name}} and here's the story behind it

1/ The Problem:
Most {{category}} tools are either too complex or too expensive. I wanted something simple that just works.

2/ The Solution:
{{name}} - {{tagline}}

{{description}}

3/ Key Features:
- Simple to use
- {{pricing}}
- Built for {{keywords}}

4/ Try it out:
{{url}}

5/ What's next:
I'm building in public and would love your feedback. What features would make this a must-have for you?

RT if you know someone who'd find this useful!`,
    variables: ['name', 'tagline', 'description', 'url', 'category', 'keywords', 'pricing'],
    tips: 'Post each tweet separately with 1-2 min delays.',
  },

  // === LINKEDIN TEMPLATES ===
  {
    id: 'linkedin_launch_post',
    name: 'LinkedIn Launch Post',
    platform: 'linkedin',
    type: 'post',
    content: `Excited to announce the launch of {{name}}!

{{tagline}}

After extensive research and development, I'm thrilled to share what we've built:

{{description}}

Who is it for?
Anyone working in {{category}} who needs a better solution.

I'd love to connect with others in the {{category}} space. Drop a comment if you'd like early access or have questions!

{{url}}

#startup #{{category}} #launch #saas`,
    variables: ['name', 'tagline', 'description', 'url', 'category'],
    tips: 'LinkedIn rewards engagement in first hour. Reply to every comment.',
  },
  {
    id: 'linkedin_dm_outreach',
    name: 'LinkedIn DM Outreach',
    platform: 'linkedin',
    type: 'dm',
    content: `Hi {{recipientName}},

I noticed you work in {{category}} and thought you might find this interesting.

I recently launched {{name}} - {{tagline}}.

It helps with {{description}}

Would love to get your thoughts if you have 2 minutes to check it out: {{url}}

No pressure at all - just thought it might be relevant to your work!

Best,
{{senderName}}`,
    variables: ['name', 'tagline', 'description', 'url', 'category'],
    tips: 'Personalize heavily. Reference something specific about the person.',
  },

  // === HACKER NEWS TEMPLATES ===
  {
    id: 'hn_show_post',
    name: 'Hacker News Show HN',
    platform: 'hackernews',
    type: 'post',
    content: `Show HN: {{name}} - {{tagline}}`,
    variables: ['name', 'tagline'],
    tips: 'Title only on HN. Keep it concise and technical. Avoid marketing language.',
  },
  {
    id: 'hn_comment',
    name: 'Hacker News First Comment',
    platform: 'hackernews',
    type: 'comment',
    content: `Hi HN! I built {{name}} because {{description}}

Technical details:
- [mention your tech stack]
- [mention interesting technical challenges]

I'd love feedback on the approach. What would you do differently?

{{url}}`,
    variables: ['name', 'description', 'url'],
    tips: 'HN values technical depth. Lead with the "why" and technical details.',
  },

  // === DIRECTORY DESCRIPTION TEMPLATES ===
  {
    id: 'directory_short_description',
    name: 'Directory Short Description',
    platform: 'directory',
    type: 'description',
    content: `{{name}} is {{tagline}}. {{description}} Perfect for {{keywords}}. {{pricing}}.`,
    variables: ['name', 'tagline', 'description', 'keywords', 'pricing'],
    tips: 'Keep under 200 characters for most directories.',
  },
  {
    id: 'directory_long_description',
    name: 'Directory Full Description',
    platform: 'directory',
    type: 'description',
    content: `{{name}} - {{tagline}}

{{description}}

Key Features:
- Easy to set up and use
- Designed for {{keywords}}
- {{pricing}}

Who is {{name}} for?
{{name}} is perfect for professionals and teams working in {{category}} who need a reliable, efficient solution.

Get started today at {{url}}`,
    variables: ['name', 'tagline', 'description', 'url', 'category', 'keywords', 'pricing'],
    tips: 'Use for directories that allow longer descriptions (500+ chars).',
  },

  // === BIO TEMPLATES ===
  {
    id: 'social_bio',
    name: 'Social Media Bio',
    platform: 'all',
    type: 'bio',
    content: `{{tagline}} | {{category}} | {{pricing}} | {{url}}`,
    variables: ['tagline', 'category', 'pricing', 'url'],
    tips: 'Keep under 160 chars for most platforms.',
  },

  // === COLD EMAIL TEMPLATE ===
  {
    id: 'cold_email_intro',
    name: 'Cold Email Introduction',
    platform: 'email',
    type: 'dm',
    content: `Subject: Quick question about your {{category}} workflow

Hi {{recipientName}},

I came across your work in {{category}} and wanted to reach out.

I recently launched {{name}} - {{tagline}}. It helps with {{description}}.

I'm reaching out to a small group of {{category}} professionals to get early feedback. Would you be open to a quick look? No strings attached.

Here's the link if you're curious: {{url}}

Either way, happy to connect!

Best,
{{senderName}}`,
    variables: ['name', 'tagline', 'description', 'url', 'category'],
    tips: 'Keep subject line short. Personalize first line. Clear CTA.',
  },
];

/**
 * Render a template with product data
 */
export function renderTemplate(template: ContentTemplate, data: Record<string, string>): string {
  let rendered = template.content;
  for (const [key, value] of Object.entries(data)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  // Remove any unreplaced variables
  rendered = rendered.replace(/\{\{[^}]+\}\}/g, '');
  return rendered.trim();
}

/**
 * Get templates for a specific platform
 */
export function getTemplatesForPlatform(platform: string): ContentTemplate[] {
  return DEFAULT_TEMPLATES.filter(t => t.platform === platform || t.platform === 'all');
}

/**
 * Get templates by type
 */
export function getTemplatesByType(type: ContentTemplate['type']): ContentTemplate[] {
  return DEFAULT_TEMPLATES.filter(t => t.type === type);
}
