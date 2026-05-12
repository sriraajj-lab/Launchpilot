/**
 * Launch Pilot - Campaign Runner
 * 
 * Orchestrates the full launch campaign: social page creation,
 * directory submissions, social posting, and outreach.
 */

import { DirectorySubmitter, ProductData, SubmissionResult } from './directory-submitter';
import { createLinkedInPage, LinkedInPageData, LinkedInCredentials } from './linkedin-page';
import { createFacebookPage, FacebookPageData, FacebookCredentials } from './facebook-page';
import { setupInstagramBusiness, InstagramProfileData, InstagramCredentials } from './instagram-profile';
import { setupTwitterProfile, TwitterProfileData, TwitterCredentials } from './twitter-profile';
import { postToReddit, RedditPostData, RedditCredentials, LAUNCH_SUBREDDITS } from './reddit-poster';
import { PLATFORMS, getFullyAutomatedPlatforms, getPlatformById } from '../platforms/registry';
import { renderTemplate, getTemplatesForPlatform, DEFAULT_TEMPLATES } from '../templates/defaults';

export interface CampaignConfig {
  product: ProductData;
  // What to do
  createSocialPages: boolean;
  submitToDirectories: boolean;
  postToSocial: boolean;
  // Which platforms
  targetPlatforms: string[]; // platform IDs from registry
  targetSubreddits: string[];
  // Credentials
  credentials: {
    linkedin?: LinkedInCredentials;
    facebook?: FacebookCredentials;
    instagram?: InstagramCredentials;
    twitter?: TwitterCredentials;
    reddit?: RedditCredentials;
    platforms: Record<string, { username: string; password: string }>;
  };
  // Timing
  delayBetweenSubmissions: number; // minutes
  scheduleStart?: Date;
}

export interface CampaignResult {
  startedAt: Date;
  completedAt: Date;
  socialPages: {
    linkedin?: { success: boolean; url?: string; error?: string };
    facebook?: { success: boolean; url?: string; error?: string };
    instagram?: { success: boolean; url?: string; error?: string };
    twitter?: { success: boolean; url?: string; error?: string };
  };
  submissions: SubmissionResult[];
  socialPosts: {
    platform: string;
    success: boolean;
    url?: string;
    error?: string;
  }[];
  summary: {
    totalAttempted: number;
    totalSuccess: number;
    totalFailed: number;
    totalManualNeeded: number;
  };
}

export class CampaignRunner {
  private config: CampaignConfig;

  constructor(config: CampaignConfig) {
    this.config = config;
  }

  /**
   * Run the full campaign
   */
  async run(): Promise<CampaignResult> {
    const result: CampaignResult = {
      startedAt: new Date(),
      completedAt: new Date(),
      socialPages: {},
      submissions: [],
      socialPosts: [],
      summary: { totalAttempted: 0, totalSuccess: 0, totalFailed: 0, totalManualNeeded: 0 },
    };

    console.log('=== LAUNCH PILOT CAMPAIGN STARTED ===');
    console.log(`Product: ${this.config.product.name}`);
    console.log(`URL: ${this.config.product.url}`);
    console.log('');

    // Phase 1: Create Social Pages
    if (this.config.createSocialPages) {
      console.log('--- Phase 1: Creating Social Pages ---');
      result.socialPages = await this.createSocialPages();
    }

    // Phase 2: Submit to Directories
    if (this.config.submitToDirectories) {
      console.log('\n--- Phase 2: Directory Submissions ---');
      result.submissions = await this.submitToDirectories();
    }

    // Phase 3: Post to Social Media
    if (this.config.postToSocial) {
      console.log('\n--- Phase 3: Social Media Posts ---');
      result.socialPosts = await this.postToSocial();
    }

    // Calculate summary
    result.completedAt = new Date();
    const allResults = [
      ...result.submissions,
      ...result.socialPosts.map(p => ({ success: p.success, needsManualAction: false })),
    ];

    result.summary = {
      totalAttempted: allResults.length,
      totalSuccess: allResults.filter(r => r.success).length,
      totalFailed: allResults.filter(r => !r.success && !('needsManualAction' in r && r.needsManualAction)).length,
      totalManualNeeded: result.submissions.filter(r => r.needsManualAction).length,
    };

    console.log('\n=== CAMPAIGN COMPLETE ===');
    console.log(`Duration: ${Math.round((result.completedAt.getTime() - result.startedAt.getTime()) / 1000 / 60)} minutes`);
    console.log(`Success: ${result.summary.totalSuccess}/${result.summary.totalAttempted}`);
    console.log(`Failed: ${result.summary.totalFailed}`);
    console.log(`Manual needed: ${result.summary.totalManualNeeded}`);

    return result;
  }

  /**
   * Phase 1: Create social media pages
   */
  private async createSocialPages(): Promise<CampaignResult['socialPages']> {
    const pages: CampaignResult['socialPages'] = {};
    const { product, credentials } = this.config;

    // LinkedIn
    if (credentials.linkedin) {
      console.log('  Creating LinkedIn Company Page...');
      try {
        const result = await createLinkedInPage(credentials.linkedin, {
          companyName: product.name,
          website: product.url,
          industry: product.category || 'Technology',
          companySize: '2-10',
          companyType: 'Privately Held',
          tagline: product.tagline,
          description: product.description,
          logoPath: product.logo,
        });
        pages.linkedin = { success: result.success, url: result.pageUrl, error: result.error };
        console.log(`  LinkedIn: ${result.success ? 'SUCCESS' : 'FAILED'} ${result.error || ''}`);
      } catch (e: any) {
        pages.linkedin = { success: false, error: e.message };
      }
      await this.delay(2, 5);
    }

    // Facebook
    if (credentials.facebook) {
      console.log('  Creating Facebook Business Page...');
      try {
        const result = await createFacebookPage(credentials.facebook, {
          pageName: product.name,
          category: product.category || 'Software Company',
          description: product.description,
          website: product.url,
          logoPath: product.logo,
        });
        pages.facebook = { success: result.success, url: result.pageUrl, error: result.error };
        console.log(`  Facebook: ${result.success ? 'SUCCESS' : 'FAILED'} ${result.error || ''}`);
      } catch (e: any) {
        pages.facebook = { success: false, error: e.message };
      }
      await this.delay(2, 5);
    }

    // Instagram
    if (credentials.instagram) {
      console.log('  Setting up Instagram Business Profile...');
      try {
        const result = await setupInstagramBusiness(credentials.instagram, {
          fullName: product.name,
          bio: product.tagline.substring(0, 150),
          website: product.url,
          email: product.email || '',
          category: product.category || 'Software',
          profileImagePath: product.logo,
        });
        pages.instagram = { success: result.success, url: result.profileUrl, error: result.error };
        console.log(`  Instagram: ${result.success ? 'SUCCESS' : 'FAILED'} ${result.error || ''}`);
      } catch (e: any) {
        pages.instagram = { success: false, error: e.message };
      }
      await this.delay(2, 5);
    }

    // Twitter
    if (credentials.twitter) {
      console.log('  Setting up Twitter/X Profile...');
      try {
        const result = await setupTwitterProfile(credentials.twitter, {
          displayName: product.name,
          bio: product.tagline.substring(0, 160),
          website: product.url,
        });
        pages.twitter = { success: result.success, url: result.profileUrl, error: result.error };
        console.log(`  Twitter: ${result.success ? 'SUCCESS' : 'FAILED'} ${result.error || ''}`);
      } catch (e: any) {
        pages.twitter = { success: false, error: e.message };
      }
    }

    return pages;
  }

  /**
   * Phase 2: Submit to directories
   */
  private async submitToDirectories(): Promise<SubmissionResult[]> {
    const submitter = new DirectorySubmitter();
    const results: SubmissionResult[] = [];

    for (let i = 0; i < this.config.targetPlatforms.length; i++) {
      const platformId = this.config.targetPlatforms[i];
      const platform = getPlatformById(platformId);
      if (!platform) continue;

      // Skip social platforms (handled in Phase 3)
      if (platform.category === 'social') continue;

      console.log(`  [${i + 1}/${this.config.targetPlatforms.length}] ${platform.name}...`);

      const creds = this.config.credentials.platforms[platformId];
      const result = await submitter.submitToPlatform(platformId, this.config.product, creds);
      results.push(result);

      console.log(`    ${result.success ? 'SUCCESS' : 'FAILED'} ${result.error || ''}`);

      // Delay between submissions
      if (i < this.config.targetPlatforms.length - 1) {
        await this.delay(this.config.delayBetweenSubmissions, this.config.delayBetweenSubmissions + 3);
      }
    }

    return results;
  }

  /**
   * Phase 3: Post to social media
   */
  private async postToSocial(): Promise<CampaignResult['socialPosts']> {
    const posts: CampaignResult['socialPosts'] = [];
    const { product, credentials } = this.config;

    const templateData = {
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      url: product.url,
      category: product.category || '',
      keywords: product.keywords || '',
      pricing: product.pricing || '',
    };

    // Reddit posts
    if (credentials.reddit && this.config.targetSubreddits.length > 0) {
      const redditTemplate = DEFAULT_TEMPLATES.find(t => t.id === 'reddit_launch_post');
      
      for (const subreddit of this.config.targetSubreddits) {
        console.log(`  Posting to r/${subreddit}...`);
        const content = redditTemplate ? renderTemplate(redditTemplate, templateData) : product.description;

        try {
          const result = await postToReddit(credentials.reddit, {
            subreddit,
            title: `I built ${product.name} - ${product.tagline}`,
            content,
            postType: 'text',
          });
          posts.push({
            platform: `reddit/r/${subreddit}`,
            success: result.success,
            url: result.postUrl,
            error: result.error,
          });
        } catch (e: any) {
          posts.push({ platform: `reddit/r/${subreddit}`, success: false, error: e.message });
        }

        // Long delay between Reddit posts
        await this.delay(15, 30);
      }
    }

    return posts;
  }

  /**
   * Wait for a random duration between min and max minutes
   */
  private async delay(minMinutes: number, maxMinutes: number): Promise<void> {
    const ms = (minMinutes + Math.random() * (maxMinutes - minMinutes)) * 60 * 1000;
    await new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Quick-launch helper - submits to all fully automated platforms
 */
export async function quickLaunch(product: ProductData, credentials: Record<string, { username: string; password: string }>): Promise<SubmissionResult[]> {
  const platforms = getFullyAutomatedPlatforms();
  const submitter = new DirectorySubmitter();
  return submitter.submitToMultiple(
    platforms.map(p => p.id),
    product,
    credentials,
    5
  );
}
