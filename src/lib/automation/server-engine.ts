/**
 * Launch Pilot - Server-Side Automation Engine
 *
 * Runs browser automation on the server (in a worker process).
 * Handles platform submissions with proper error handling and screenshots.
 * Designed for web deployment - runs headless with no user interaction.
 *
 * NOTE: This module requires Playwright (devDependency).
 * It is NOT used on Vercel — only by the separate worker process.
 */

import type { Browser, BrowserContext, Page } from 'playwright';
import { getPlatformById, PlatformConfig } from '../platforms/registry';

export interface ProductSubmitData {
  name: string;
  tagline: string;
  description: string;
  url: string;
  category: string;
  keywords: string;
  pricing: string | null;
  logoUrl: string | null;
}

export interface AutomationResult {
  success: boolean;
  submittedUrl?: string;
  error?: string;
  screenshotBase64?: string;
  needsCaptcha?: boolean;
  needsManualAction?: boolean;
  manualActionDescription?: string;
}

// User agents to rotate
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
];

/**
 * Lazily load Playwright chromium to avoid crashing in environments
 * where Playwright is not installed (e.g. Vercel serverless).
 */
async function getChromium() {
  try {
    const pw = await import('playwright');
    return pw.chromium;
  } catch {
    throw new Error(
      'Playwright is not available in this environment. ' +
      'Browser automation is only supported in the worker process, not on Vercel serverless.'
    );
  }
}

export class ServerAutomationEngine {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  /**
   * Submit product to a platform
   */
  async submitToPlatform(
    platformId: string,
    product: ProductSubmitData,
    credentials?: { username: string; password: string }
  ): Promise<AutomationResult> {
    const platform = getPlatformById(platformId);
    if (!platform) {
      return { success: false, error: `Platform "${platformId}" not found` };
    }

    try {
      await this.launchBrowser();

      // Login if required
      if (platform.loginRequired && credentials) {
        const loginOk = await this.loginToPlatform(platform, credentials);
        if (!loginOk.success) return loginOk;
        await this.delay(1500, 3000);
      }

      // Navigate to submission page
      await this.goto(platform.submitUrl);
      await this.delay(2000, 4000);

      // Check for CAPTCHA before filling
      const captcha = await this.detectCaptcha();
      if (captcha) {
        const screenshot = await this.takeScreenshot();
        return {
          success: false,
          needsCaptcha: true,
          needsManualAction: true,
          manualActionDescription: `${platform.name} has CAPTCHA on submission page`,
          screenshotBase64: screenshot,
        };
      }

      // Fill the form
      await this.fillForm(platform, product);
      await this.delay(1000, 2000);

      // Check for CAPTCHA after filling (some appear dynamically)
      const captchaAfter = await this.detectCaptcha();
      if (captchaAfter) {
        const screenshot = await this.takeScreenshot();
        return {
          success: false,
          needsCaptcha: true,
          needsManualAction: true,
          manualActionDescription: `${platform.name} showed CAPTCHA after form fill`,
          screenshotBase64: screenshot,
        };
      }

      // Submit
      const submitResult = await this.submitForm(platform);
      return submitResult;
    } catch (error: any) {
      const screenshot = await this.takeScreenshot().catch(() => undefined);
      return {
        success: false,
        error: error.message,
        screenshotBase64: screenshot,
      };
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Launch headless browser with stealth settings
   */
  private async launchBrowser(): Promise<void> {
    const chromium = await getChromium();

    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

    this.context = await this.browser.newContext({
      userAgent,
      viewport: { width: 1366, height: 768 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
    });

    // Anti-detection scripts
    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      (window as any).chrome = { runtime: {} };
    });

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(30000);
  }

  /**
   * Navigate with retries
   */
  private async goto(url: string): Promise<void> {
    for (let i = 0; i < 3; i++) {
      try {
        await this.page!.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        return;
      } catch {
        if (i === 2) throw new Error(`Failed to navigate to ${url}`);
        await this.delay(2000, 4000);
      }
    }
  }

  /**
   * Generic login flow
   */
  private async loginToPlatform(
    platform: PlatformConfig,
    credentials: { username: string; password: string }
  ): Promise<AutomationResult> {
    await this.goto(platform.url);
    await this.delay(1500, 3000);

    // Find login link
    const loginSelectors = [
      'a:has-text("Log in")', 'a:has-text("Login")', 'a:has-text("Sign in")',
      'button:has-text("Log in")', '[href*="/login"]', '[href*="/signin"]',
    ];

    for (const sel of loginSelectors) {
      try {
        const el = await this.page!.$(sel);
        if (el) {
          await el.click();
          await this.page!.waitForLoadState('domcontentloaded');
          await this.delay(2000, 3000);
          break;
        }
      } catch { /* skip */ }
    }

    // Fill login form
    const emailSels = ['input[name="email"]', 'input[type="email"]', 'input[name="username"]', '#email', '#username'];
    const passSels = ['input[name="password"]', 'input[type="password"]', '#password'];

    let emailFilled = false;
    for (const sel of emailSels) {
      try {
        const el = await this.page!.$(sel);
        if (el && await el.isVisible()) {
          await this.humanType(sel, credentials.username);
          emailFilled = true;
          break;
        }
      } catch { /* skip */ }
    }

    if (!emailFilled) {
      return { success: false, error: `Cannot find login form on ${platform.name}` };
    }

    await this.delay(500, 1000);

    for (const sel of passSels) {
      try {
        const el = await this.page!.$(sel);
        if (el && await el.isVisible()) {
          await this.humanType(sel, credentials.password);
          break;
        }
      } catch { /* skip */ }
    }

    await this.delay(500, 1500);

    // Submit
    const submitSels = ['button[type="submit"]', 'input[type="submit"]', 'button:has-text("Log in")', 'button:has-text("Sign in")'];
    for (const sel of submitSels) {
      try {
        const el = await this.page!.$(sel);
        if (el && await el.isVisible()) {
          await el.click();
          break;
        }
      } catch { /* skip */ }
    }

    await this.page!.waitForLoadState('networkidle').catch(() => {});
    await this.delay(2000, 4000);

    // Check for CAPTCHA after login
    if (await this.detectCaptcha()) {
      const screenshot = await this.takeScreenshot();
      return {
        success: false,
        needsCaptcha: true,
        needsManualAction: true,
        manualActionDescription: `${platform.name} login requires CAPTCHA`,
        screenshotBase64: screenshot,
      };
    }

    return { success: true };
  }

  /**
   * Fill form fields based on platform config
   */
  private async fillForm(platform: PlatformConfig, product: ProductSubmitData): Promise<void> {
    for (const field of platform.fields) {
      const value = this.getFieldValue(field.mapTo, product);
      if (!value) continue;

      try {
        const el = await this.page!.$(field.selector);
        if (!el || !(await el.isVisible())) continue;

        switch (field.type) {
          case 'text':
          case 'url':
          case 'email':
            await this.humanType(field.selector, field.maxLength ? value.substring(0, field.maxLength) : value);
            break;
          case 'textarea':
            await this.humanType(field.selector, field.maxLength ? value.substring(0, field.maxLength) : value);
            break;
          case 'select':
            await this.page!.selectOption(field.selector, { label: value }).catch(() => {
              // Try by value
              return this.page!.selectOption(field.selector, value);
            }).catch(() => { /* skip */ });
            break;
          case 'checkbox':
            await el.click();
            break;
        }

        await this.delay(500, 1500);
      } catch {
        // Skip fields that can't be filled
      }
    }
  }

  /**
   * Map field name to product data
   */
  private getFieldValue(mapTo: string, product: ProductSubmitData): string | null {
    const map: Record<string, string | null> = {
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      url: product.url,
      category: product.category,
      keywords: product.keywords,
      pricing: product.pricing,
      logo: product.logoUrl,
    };
    return map[mapTo] || null;
  }

  /**
   * Click submit button
   */
  private async submitForm(platform: PlatformConfig): Promise<AutomationResult> {
    const submitSels = [
      'button[type="submit"]', 'input[type="submit"]',
      'button:has-text("Submit")', 'button:has-text("Create")',
      'button:has-text("Add")', 'button:has-text("Publish")',
      'button:has-text("Launch")', 'button:has-text("Send")',
    ];

    let clicked = false;
    for (const sel of submitSels) {
      try {
        const el = await this.page!.$(sel);
        if (el && await el.isVisible()) {
          await el.click();
          clicked = true;
          break;
        }
      } catch { /* skip */ }
    }

    if (!clicked) {
      const screenshot = await this.takeScreenshot();
      return {
        success: false,
        needsManualAction: true,
        manualActionDescription: `Form filled on ${platform.name} but submit button not found`,
        screenshotBase64: screenshot,
      };
    }

    await this.page!.waitForLoadState('networkidle').catch(() => {});
    await this.delay(3000, 5000);

    // Check for success
    const currentUrl = this.page!.url();
    const screenshot = await this.takeScreenshot();

    return {
      success: true,
      submittedUrl: currentUrl,
      screenshotBase64: screenshot,
    };
  }

  /**
   * Type with human-like delays
   */
  private async humanType(selector: string, text: string): Promise<void> {
    await this.page!.click(selector);
    await this.delay(200, 500);
    await this.page!.fill(selector, ''); // Clear first
    await this.page!.type(selector, text, { delay: 30 + Math.random() * 70 });
  }

  /**
   * Detect CAPTCHA on current page
   */
  private async detectCaptcha(): Promise<boolean> {
    const selectors = [
      'iframe[src*="recaptcha"]', 'iframe[src*="hcaptcha"]',
      '.g-recaptcha', '.h-captcha', '[data-sitekey]',
      'iframe[src*="challenge"]', '#captcha', '.captcha',
    ];

    for (const sel of selectors) {
      const el = await this.page!.$(sel);
      if (el) return true;
    }
    return false;
  }

  /**
   * Take a screenshot and return as base64
   */
  private async takeScreenshot(): Promise<string> {
    if (!this.page) return '';
    const buffer = await this.page.screenshot({ type: 'jpeg', quality: 60, fullPage: false });
    return buffer.toString('base64');
  }

  /**
   * Random delay
   */
  private async delay(min: number, max: number): Promise<void> {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup browser resources
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();
    } catch { /* ignore */ }
    this.page = null;
    this.context = null;
    this.browser = null;
  }
}
