/**
 * Launch Pilot - Reddit Posting Automation
 * 
 * Handles Reddit posting with anti-bot awareness.
 * Strategy: Pre-fill content and open browser for manual submit on protected subreddits.
 * Can auto-submit on less protected ones.
 */

import { AutomationBrowser, createBrowser } from './browser';
import { Page } from 'playwright';

export interface RedditPostData {
  subreddit: string;
  title: string;
  content: string; // text post body
  url?: string; // for link posts
  flair?: string;
  postType: 'text' | 'link';
}

export interface RedditCredentials {
  username: string;
  password: string;
}

export interface RedditPostResult {
  success: boolean;
  postUrl?: string;
  error?: string;
  screenshotPath?: string;
  needsManualAction?: boolean;
  manualActionDescription?: string;
}

// Subreddits known to be good for launches
export const LAUNCH_SUBREDDITS = [
  { name: 'SideProject', minKarma: 0, postType: 'text' as const, selfPromoAllowed: true },
  { name: 'startups', minKarma: 10, postType: 'text' as const, selfPromoAllowed: true },
  { name: 'indiehackers', minKarma: 0, postType: 'text' as const, selfPromoAllowed: true },
  { name: 'InternetIsBeautiful', minKarma: 100, postType: 'link' as const, selfPromoAllowed: false },
  { name: 'webdev', minKarma: 50, postType: 'text' as const, selfPromoAllowed: false },
  { name: 'programming', minKarma: 100, postType: 'link' as const, selfPromoAllowed: false },
  { name: 'SaaS', minKarma: 0, postType: 'text' as const, selfPromoAllowed: true },
  { name: 'Entrepreneur', minKarma: 10, postType: 'text' as const, selfPromoAllowed: true },
  { name: 'smallbusiness', minKarma: 10, postType: 'text' as const, selfPromoAllowed: true },
  { name: 'alphaandbetausers', minKarma: 0, postType: 'text' as const, selfPromoAllowed: true },
  { name: 'IMadeThis', minKarma: 0, postType: 'text' as const, selfPromoAllowed: true },
  { name: 'buildinpublic', minKarma: 0, postType: 'text' as const, selfPromoAllowed: true },
  { name: 'microsaas', minKarma: 0, postType: 'text' as const, selfPromoAllowed: true },
  { name: 'ProductivityApps', minKarma: 0, postType: 'text' as const, selfPromoAllowed: true },
  { name: 'roastmystartup', minKarma: 0, postType: 'text' as const, selfPromoAllowed: true },
];

export class RedditPoster {
  private browser: AutomationBrowser;
  private page: Page | null = null;

  constructor() {
    this.browser = createBrowser({
      headless: false, // Reddit heavily detects headless
      slowMo: 150,
    });
  }

  /**
   * Post to a single subreddit
   */
  async post(credentials: RedditCredentials, postData: RedditPostData): Promise<RedditPostResult> {
    try {
      this.page = await this.browser.launch();

      // Step 1: Login
      const loginResult = await this.login(credentials);
      if (!loginResult.success) return loginResult;

      // Step 2: Navigate to subreddit submit page
      await this.browser.randomDelay(2000, 4000);
      const submitResult = await this.submitPost(postData);

      return submitResult;
    } catch (error: any) {
      const screenshotPath = await this.browser.screenshot('reddit-error');
      return {
        success: false,
        error: error.message,
        screenshotPath,
      };
    } finally {
      // Don't close browser if manual action needed
      if (this.page) {
        const url = this.page.url();
        if (!url.includes('/submit')) {
          await this.browser.close();
        }
      }
    }
  }

  /**
   * Post to multiple subreddits with delays
   */
  async postToMultiple(
    credentials: RedditCredentials,
    posts: RedditPostData[],
    delayBetweenMinutes = 15
  ): Promise<RedditPostResult[]> {
    const results: RedditPostResult[] = [];

    for (let i = 0; i < posts.length; i++) {
      const result = await this.post(credentials, posts[i]);
      results.push(result);

      // Wait between posts to look natural
      if (i < posts.length - 1) {
        const delayMs = delayBetweenMinutes * 60 * 1000 + Math.random() * 5 * 60 * 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }

  /**
   * Login to Reddit (old.reddit.com is more automation-friendly)
   */
  private async login(credentials: RedditCredentials): Promise<RedditPostResult> {
    await this.browser.goto('https://www.reddit.com/login');
    await this.browser.randomDelay(2000, 3000);

    // Check if already logged in
    const isLoggedIn = await this.browser.elementExists('[data-testid="user-drawer-button"]') ||
                       await this.browser.elementExists('#user-drawer-button');
    if (isLoggedIn) {
      return { success: true };
    }

    // Fill login form
    const usernameInput = await this.browser.elementExists('input[name="username"]');
    if (usernameInput) {
      await this.browser.humanType('input[name="username"]', credentials.username);
      await this.browser.randomDelay(500, 1000);
      await this.browser.humanType('input[name="password"]', credentials.password);
      await this.browser.randomDelay(500, 1500);

      // Submit
      await this.browser.humanClick('button[type="submit"]');
      await this.browser.waitForNavigation();
      await this.browser.randomDelay(3000, 5000);
    }

    // Check for CAPTCHA
    const captcha = await this.browser.detectCaptcha();
    if (captcha.hasCaptcha) {
      const screenshotPath = await this.browser.screenshot('reddit-captcha');
      return {
        success: false,
        needsManualAction: true,
        manualActionDescription: 'Reddit CAPTCHA detected. Please solve manually and try again.',
        screenshotPath,
      };
    }

    // Check for 2FA
    const has2FA = await this.browser.elementExists('input[name="otp"]');
    if (has2FA) {
      const screenshotPath = await this.browser.screenshot('reddit-2fa');
      return {
        success: false,
        needsManualAction: true,
        manualActionDescription: 'Reddit requires 2FA code. Please enter manually.',
        screenshotPath,
      };
    }

    // Verify login
    await this.browser.randomDelay(2000, 3000);
    const loginSuccess = await this.browser.elementExists('[data-testid="user-drawer-button"]') ||
                         await this.browser.elementExists('#user-drawer-button') ||
                         !(await this.browser.elementExists('input[name="username"]'));

    if (!loginSuccess) {
      const screenshotPath = await this.browser.screenshot('reddit-login-failed');
      return {
        success: false,
        error: 'Reddit login failed',
        screenshotPath,
      };
    }

    return { success: true };
  }

  /**
   * Submit a post to a subreddit
   */
  private async submitPost(postData: RedditPostData): Promise<RedditPostResult> {
    // Navigate to subreddit submit page
    const submitUrl = `https://www.reddit.com/r/${postData.subreddit}/submit`;
    await this.browser.goto(submitUrl);
    await this.browser.randomDelay(2000, 4000);

    // Check if we can post (karma requirements, banned, etc.)
    const cantPost = await this.browser.elementExists('[class*="error"]') ||
                     await this.browser.elementExists(':has-text("not allowed to post")');
    if (cantPost) {
      const screenshotPath = await this.browser.screenshot('reddit-cant-post');
      return {
        success: false,
        error: `Cannot post to r/${postData.subreddit} - may need more karma or account age`,
        screenshotPath,
      };
    }

    // Select post type (text vs link)
    if (postData.postType === 'link') {
      const linkTab = await this.browser.elementExists('button:has-text("Link"), [role="tab"]:has-text("Link")');
      if (linkTab) {
        await this.browser.humanClick('button:has-text("Link"), [role="tab"]:has-text("Link")');
        await this.browser.randomDelay(500, 1000);
      }
    }

    // Fill title
    const titleInput = 'textarea[placeholder*="title" i], input[name="title"], textarea[name="title"]';
    await this.browser.humanType(titleInput, postData.title);
    await this.browser.randomDelay(500, 1000);

    // Fill content
    if (postData.postType === 'text') {
      const contentInput = 'div[contenteditable="true"], textarea[name="text"], .public-DraftEditor-content';
      const hasContentInput = await this.browser.elementExists(contentInput);
      if (hasContentInput) {
        await this.browser.humanClick(contentInput);
        await this.browser.randomDelay(300, 600);
        // Type content line by line for rich text editor
        const lines = postData.content.split('\n');
        for (const line of lines) {
          await this.browser.humanType(contentInput, line);
          await this.page!.keyboard.press('Enter');
          await this.browser.randomDelay(100, 300);
        }
      }
    } else if (postData.postType === 'link' && postData.url) {
      const urlInput = 'input[name="url"], input[placeholder*="url" i]';
      await this.browser.humanType(urlInput, postData.url);
      await this.browser.randomDelay(500, 1000);
    }

    // Select flair if specified
    if (postData.flair) {
      const flairBtn = await this.browser.elementExists('button:has-text("Flair"), button:has-text("Add flair")');
      if (flairBtn) {
        await this.browser.humanClick('button:has-text("Flair"), button:has-text("Add flair")');
        await this.browser.randomDelay(1000, 2000);
        const flairOption = await this.browser.elementExists(`button:has-text("${postData.flair}")`);
        if (flairOption) {
          await this.browser.humanClick(`button:has-text("${postData.flair}")`);
          await this.browser.randomDelay(500, 1000);
          // Apply flair
          const applyBtn = await this.browser.elementExists('button:has-text("Apply")');
          if (applyBtn) {
            await this.browser.humanClick('button:has-text("Apply")');
          }
        }
      }
    }

    // Take screenshot of filled form
    await this.browser.screenshot(`reddit-prefilled-${postData.subreddit}`);

    // For Reddit, we recommend manual submit due to anti-bot
    // But attempt auto-submit
    const submitBtn = 'button:has-text("Post"), button[type="submit"]:has-text("Post")';
    const hasSubmit = await this.browser.elementExists(submitBtn);

    if (hasSubmit) {
      await this.browser.humanClick(submitBtn);
      await this.browser.randomDelay(3000, 5000);

      // Check if post was created
      const currentUrl = this.page!.url();
      if (currentUrl.includes('/comments/')) {
        return {
          success: true,
          postUrl: currentUrl,
        };
      }

      // Check for errors (rate limiting, etc.)
      const errorMsg = await this.browser.elementExists('[class*="error"], [role="alert"]');
      if (errorMsg) {
        const errorText = await this.browser.getText('[class*="error"], [role="alert"]');
        return {
          success: false,
          error: `Post failed: ${errorText}`,
          needsManualAction: true,
          manualActionDescription: `Post to r/${postData.subreddit} needs manual submission. Content is pre-filled.`,
        };
      }
    }

    return {
      success: false,
      needsManualAction: true,
      manualActionDescription: `Post to r/${postData.subreddit} is pre-filled. Please click "Post" manually. Browser left open.`,
    };
  }
}

/**
 * Quick helper to post to Reddit
 */
export async function postToReddit(
  credentials: RedditCredentials,
  postData: RedditPostData
): Promise<RedditPostResult> {
  const poster = new RedditPoster();
  return poster.post(credentials, postData);
}
