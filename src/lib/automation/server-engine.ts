/**
 * Launch Pilot - Server-Side Automation Engine (v2 - Fully Autonomous)
 *
 * Runs browser automation on the server in the worker process.
 * Now uses adaptive form detection - doesn't rely solely on hardcoded selectors.
 * Falls back to intelligent DOM scanning when specific selectors fail.
 *
 * Key improvements over v1:
 * - Adaptive form filling (finds inputs by label, placeholder, type)
 * - Multiple submit button strategies
 * - Better error recovery
 * - Cookie consent auto-dismissal
 * - Popup/modal auto-close
 * - Wait strategies for dynamic pages
 * - 2Captcha integration hook
 */

import type { Browser, BrowserContext, Page, ElementHandle } from 'playwright';
import { getPlatformById, PlatformConfig, PlatformField } from '../platforms/registry';

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
  pageHtml?: string; // For captcha siteKey extraction
  actionUrl?: string;  // URL the user should visit to complete action
  actionType?: 'captcha' | 'login' | 'manual_submit' | 'payment' | 'security_challenge'; // What the user needs to do
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
];

async function getChromium() {
  const pw = await import('playwright');
  return pw.chromium;
}

export class ServerAutomationEngine {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

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

      // Dismiss cookie consent popups proactively
      this.page!.on('dialog', dialog => dialog.dismiss().catch(() => {}));

      // Login if required
      if (platform.loginRequired && credentials) {
        const loginOk = await this.loginToPlatform(platform, credentials);
        if (!loginOk.success) {
          // If login failed due to CAPTCHA or other issue, provide the login URL
          if (loginOk.needsCaptcha || loginOk.needsManualAction) {
            return {
              ...loginOk,
              actionUrl: loginOk.actionUrl || `${platform.url}/login`,
              actionType: loginOk.needsCaptcha ? 'captcha' : 'login',
            };
          }
          return {
            ...loginOk,
            actionUrl: `${platform.url}/login`,
            actionType: 'login',
          };
        }
        await this.delay(2000, 4000);
      }

      // If login is required but no credentials provided, alert the user
      if (platform.loginRequired && !credentials) {
        const screenshot = await this.takeScreenshot();
        return {
          success: false,
          needsManualAction: true,
          manualActionDescription: `${platform.name} requires you to log in first. Click "Open Platform" to go to the login page, sign in, then come back and click "Done, Continue".`,
          actionUrl: platform.url,
          actionType: 'login',
          screenshotBase64: screenshot,
        };
      }

      // Navigate to submission page
      await this.goto(platform.submitUrl);
      await this.delay(2000, 4000);

      // Dismiss any cookie/popup overlays
      await this.dismissOverlays();

      // Check for Cloudflare/security challenge
      const challengeResult = await this.handleSecurityChallenge(platform);
      if (challengeResult) return challengeResult;

      // Check for CAPTCHA
      const captchaResult = await this.handleCaptcha(platform);
      if (captchaResult) return captchaResult;

      // Fill the form - try platform-specific selectors first, then adaptive
      const fillResult = await this.fillFormAdaptive(platform, product);
      if (!fillResult.success) {
        return fillResult;
      }

      await this.delay(1000, 2000);

      // Check for CAPTCHA again (some appear after form fill)
      const captchaResult2 = await this.handleCaptcha(platform);
      if (captchaResult2) return captchaResult2;

      // Submit the form
      const submitResult = await this.submitFormAdaptive(platform);
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

  // === BROWSER MANAGEMENT ===

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
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
      ],
    });

    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

    this.context = await this.browser.newContext({
      userAgent,
      viewport: { width: 1366, height: 768 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
      javaScriptEnabled: true,
    });

    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      (window as any).chrome = { runtime: {}, loadTimes: () => {} };
      // Override permissions query
      const orig = navigator.permissions.query;
      navigator.permissions.query = (params: any) =>
        params.name === 'notifications'
          ? Promise.resolve({ state: 'denied' } as PermissionStatus)
          : orig.call(navigator.permissions, params);
    });

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(30000);
    this.page.setDefaultNavigationTimeout(45000);
  }

  private async goto(url: string): Promise<void> {
    for (let i = 0; i < 3; i++) {
      try {
        await this.page!.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        // Wait for JS-rendered content to appear
        await this.delay(2000, 4000);
        // Try to wait for network to settle (JS frameworks loading)
        await this.page!.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        return;
      } catch (e: any) {
        if (i === 2) throw new Error(`Failed to navigate to ${url}: ${e.message}`);
        await this.delay(3000, 5000);
      }
    }
  }

  // === FORM FILLING (ADAPTIVE) ===

  /**
   * Adaptive form filling - tries specific selectors first, then smart detection
   */
  private async fillFormAdaptive(platform: PlatformConfig, product: ProductSubmitData): Promise<AutomationResult> {
    let fieldsFilledCount = 0;

    for (const field of platform.fields) {
      const value = this.getFieldValue(field.mapTo, product);
      if (!value) continue;

      // Strategy 1: Try the exact selector from platform config
      let filled = await this.tryFillSelector(field.selector, value, field.type);

      // Strategy 2: Try common variations of the selector
      if (!filled) {
        const altSelectors = this.generateAlternativeSelectors(field);
        for (const alt of altSelectors) {
          filled = await this.tryFillSelector(alt, value, field.type);
          if (filled) break;
        }
      }

      // Strategy 3: Find input by label text
      if (!filled) {
        filled = await this.fillByLabel(field.name, value, field.type);
      }

      // Strategy 4: Find input by placeholder text
      if (!filled) {
        filled = await this.fillByPlaceholder(field.name, value, field.type);
      }

      if (filled) {
        fieldsFilledCount++;
        await this.delay(300, 800);
      }
    }

    // Need at least URL filled to consider it worthwhile
    if (fieldsFilledCount === 0) {
      const screenshot = await this.takeScreenshot();
      const currentUrl = this.page!.url();
      return {
        success: false,
        needsManualAction: true,
        manualActionDescription: `Could not find form fields on ${platform.name}. The page may require login or has changed. Click "Open Platform" to submit manually, then click "Done, Continue".`,
        actionUrl: currentUrl || platform.submitUrl,
        actionType: 'manual_submit',
        screenshotBase64: screenshot,
      };
    }

    return { success: true };
  }

  /**
   * Try to fill a specific selector with a value
   */
  private async tryFillSelector(selector: string, value: string, type: string): Promise<boolean> {
    try {
      const el = await this.page!.$(selector);
      if (!el) return false;
      if (!(await el.isVisible().catch(() => false))) return false;

      if (type === 'select') {
        await this.page!.selectOption(selector, { label: value }).catch(() =>
          this.page!.selectOption(selector, value).catch(() => {})
        );
      } else if (type === 'checkbox') {
        await el.click();
      } else if (type === 'file') {
        // Skip file uploads in autonomous mode for now
        return false;
      } else {
        await this.page!.click(selector);
        await this.page!.fill(selector, '');
        await this.page!.type(selector, value, { delay: 20 + Math.random() * 40 });
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate alternative selectors when the primary one fails
   */
  private generateAlternativeSelectors(field: PlatformField): string[] {
    const alternatives: string[] = [];
    const mapTo = field.mapTo;

    // Common selector patterns for each field type
    if (mapTo === 'name') {
      alternatives.push(
        'input[name*="name"]', 'input[id*="name"]', 'input[placeholder*="name" i]',
        'input[placeholder*="Name"]', 'input[aria-label*="name" i]',
        'input[name="title"]', 'input[id*="title"]',
        '#name', '#title', '#product-name', '#productName',
      );
    } else if (mapTo === 'url') {
      alternatives.push(
        'input[name*="url"]', 'input[name*="website"]', 'input[name*="link"]',
        'input[type="url"]', 'input[placeholder*="url" i]', 'input[placeholder*="http"]',
        'input[id*="url"]', 'input[id*="website"]', '#url', '#website', '#link',
      );
    } else if (mapTo === 'description') {
      alternatives.push(
        'textarea[name*="description"]', 'textarea[name*="desc"]', 'textarea[name*="about"]',
        'textarea[placeholder*="description" i]', 'textarea[placeholder*="describe" i]',
        'textarea[id*="description"]', 'textarea', // Last resort: first textarea
        '#description', '#desc', '#about',
        'div[contenteditable="true"]',
      );
    } else if (mapTo === 'tagline') {
      alternatives.push(
        'input[name*="tagline"]', 'input[name*="slogan"]', 'input[name*="subtitle"]',
        'input[placeholder*="tagline" i]', 'input[placeholder*="one-liner" i]',
        'input[name*="short"]', '#tagline', '#slogan',
      );
    } else if (mapTo === 'email') {
      alternatives.push(
        'input[type="email"]', 'input[name*="email"]', 'input[id*="email"]',
        'input[placeholder*="email" i]', '#email',
      );
    } else if (mapTo === 'category') {
      alternatives.push(
        'select[name*="category"]', 'select[name*="type"]', 'select[id*="category"]',
        '#category', '#type',
      );
    }

    return alternatives;
  }

  /**
   * Find and fill an input field by its associated label text
   */
  private async fillByLabel(labelText: string, value: string, type: string): Promise<boolean> {
    try {
      // Try to find label element and associated input
      const label = await this.page!.$(`label:has-text("${labelText}")`);
      if (label) {
        const forAttr = await label.getAttribute('for');
        if (forAttr) {
          return await this.tryFillSelector(`#${forAttr}`, value, type);
        }
        // Label might wrap the input
        const input = await label.$('input, textarea, select');
        if (input && await input.isVisible()) {
          if (type === 'select') {
            await input.selectOption({ label: value }).catch(() => {});
          } else {
            await input.click();
            await input.fill('');
            await input.type(value, { delay: 30 });
          }
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Find and fill an input field by placeholder text
   */
  private async fillByPlaceholder(hintText: string, value: string, type: string): Promise<boolean> {
    try {
      const keywords = hintText.toLowerCase().split(' ').filter(w => w.length > 3);
      for (const kw of keywords) {
        const selectors = [
          `input[placeholder*="${kw}" i]`,
          `textarea[placeholder*="${kw}" i]`,
        ];
        for (const sel of selectors) {
          const filled = await this.tryFillSelector(sel, value, type);
          if (filled) return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  // === FORM SUBMISSION (ADAPTIVE) ===

  private async submitFormAdaptive(platform: PlatformConfig): Promise<AutomationResult> {
    // Try multiple submit strategies
    const submitStrategies = [
      // Specific submit buttons
      'button[type="submit"]',
      'input[type="submit"]',
      // Text-based buttons
      'button:has-text("Submit")',
      'button:has-text("Create")',
      'button:has-text("Add")',
      'button:has-text("Publish")',
      'button:has-text("Launch")',
      'button:has-text("Send")',
      'button:has-text("Save")',
      'button:has-text("Post")',
      'button:has-text("Register")',
      'button:has-text("Sign up")',
      'button:has-text("List")',
      // Links styled as buttons
      'a:has-text("Submit")',
      'a:has-text("Create")',
      // Generic primary buttons
      'button.btn-primary',
      'button.submit',
      'button.primary',
      '[class*="submit"]',
      '[class*="primary"] button',
    ];

    const urlBefore = this.page!.url();

    for (const sel of submitStrategies) {
      try {
        const el = await this.page!.$(sel);
        if (el && await el.isVisible()) {
          // Scroll into view
          await el.scrollIntoViewIfNeeded().catch(() => {});
          await this.delay(300, 600);
          await el.click();
          
          // Wait for navigation or network response
          await Promise.race([
            this.page!.waitForLoadState('networkidle', { timeout: 15000 }),
            this.page!.waitForNavigation({ timeout: 15000 }),
            this.delay(8000, 8000), // Max 8 seconds
          ]).catch(() => {});

          await this.delay(2000, 3000);

          // Check if page changed (indicates submission went through)
          const urlAfter = this.page!.url();
          const screenshot = await this.takeScreenshot();

          // Look for success indicators
          const hasSuccess = await this.checkForSuccess();
          const hasError = await this.checkForError();

          if (hasError) {
            const errorText = await this.getErrorText();
            return {
              success: false,
              error: errorText || `Submission error on ${platform.name}`,
              screenshotBase64: screenshot,
            };
          }

          if (hasSuccess || urlAfter !== urlBefore) {
            return {
              success: true,
              submittedUrl: urlAfter,
              screenshotBase64: screenshot,
            };
          }

          // Button was clicked but unclear if it worked - assume success if no error
          return {
            success: true,
            submittedUrl: urlAfter,
            screenshotBase64: screenshot,
          };
        }
      } catch {
        continue;
      }
    }

    // No submit button found
    const screenshot = await this.takeScreenshot();
    const currentUrl = this.page!.url();
    return {
      success: false,
      needsManualAction: true,
      manualActionDescription: `Form filled on ${platform.name} but could not find submit button. Click "Open Platform" to submit manually, then click "Done, Continue".`,
      actionUrl: currentUrl || platform.submitUrl,
      actionType: 'manual_submit',
      screenshotBase64: screenshot,
    };
  }

  // === LOGIN ===

  private async loginToPlatform(
    platform: PlatformConfig,
    credentials: { username: string; password: string }
  ): Promise<AutomationResult> {
    await this.goto(platform.url);
    await this.delay(1500, 3000);
    await this.dismissOverlays();

    // Find and click login link
    const loginSelectors = [
      'a:has-text("Log in")', 'a:has-text("Login")', 'a:has-text("Sign in")',
      'a:has-text("Sign In")', 'button:has-text("Log in")', 'button:has-text("Sign in")',
      '[href*="/login"]', '[href*="/signin"]', '[href*="/sign-in"]',
      '[href*="login"]', '[href*="signin"]',
    ];

    for (const sel of loginSelectors) {
      try {
        const el = await this.page!.$(sel);
        if (el && await el.isVisible()) {
          await el.click();
          await this.page!.waitForLoadState('domcontentloaded').catch(() => {});
          await this.delay(2000, 3000);
          break;
        }
      } catch {}
    }

    await this.dismissOverlays();

    // Fill email/username
    const emailSels = [
      'input[name="email"]', 'input[type="email"]', 'input[name="username"]',
      'input[name="login"]', 'input[name="user"]', 'input[id*="email"]',
      'input[id*="user"]', 'input[placeholder*="email" i]', 'input[placeholder*="user" i]',
      '#email', '#username', '#login-email',
    ];

    let emailFilled = false;
    for (const sel of emailSels) {
      if (await this.tryFillSelector(sel, credentials.username, 'text')) {
        emailFilled = true;
        break;
      }
    }

    if (!emailFilled) {
      return { success: false, error: `Cannot find login form on ${platform.name}`, actionUrl: `${platform.url}/login`, actionType: 'login' as const };
    }

    await this.delay(500, 1000);

    // Fill password
    const passSels = [
      'input[name="password"]', 'input[type="password"]', '#password',
      'input[id*="password"]', 'input[placeholder*="password" i]',
    ];

    for (const sel of passSels) {
      if (await this.tryFillSelector(sel, credentials.password, 'text')) break;
    }

    await this.delay(500, 1500);

    // Submit login
    const loginBtnSels = [
      'button[type="submit"]', 'input[type="submit"]',
      'button:has-text("Log in")', 'button:has-text("Sign in")',
      'button:has-text("Login")', 'button:has-text("Submit")',
    ];

    for (const sel of loginBtnSels) {
      try {
        const el = await this.page!.$(sel);
        if (el && await el.isVisible()) {
          await el.click();
          break;
        }
      } catch {}
    }

    await this.page!.waitForLoadState('networkidle').catch(() => {});
    await this.delay(3000, 5000);

    // Check for CAPTCHA
    if (await this.detectCaptcha()) {
      const screenshot = await this.takeScreenshot();
      const html = await this.page!.content();
      return {
        success: false,
        needsCaptcha: true,
        needsManualAction: true,
        manualActionDescription: `${platform.name} login has CAPTCHA. Click "Open Platform" to solve it and log in, then click "Done, Continue".`,
        actionUrl: this.page!.url() || `${platform.url}/login`,
        actionType: 'captcha',
        screenshotBase64: screenshot,
        pageHtml: html,
      };
    }

    return { success: true };
  }

  // === CAPTCHA HANDLING ===

  private async handleCaptcha(platform: PlatformConfig): Promise<AutomationResult | null> {
    if (await this.detectCaptcha()) {
      const screenshot = await this.takeScreenshot();
      const html = await this.page!.content();
      const currentUrl = this.page!.url();
      return {
        success: false,
        needsCaptcha: true,
        manualActionDescription: `${platform.name} has a CAPTCHA challenge. Click "Open Platform" to solve it in your browser, then click "Done, Continue" to retry.`,
        actionUrl: currentUrl || platform.submitUrl,
        actionType: 'captcha',
        screenshotBase64: screenshot,
        pageHtml: html,
      };
    }
    return null;
  }

  private async detectCaptcha(): Promise<boolean> {
    const selectors = [
      'iframe[src*="recaptcha"]', 'iframe[src*="hcaptcha"]',
      'iframe[src*="captcha"]', '.g-recaptcha', '.h-captcha',
      '[data-sitekey]', '#captcha', '.captcha',
      'iframe[title*="reCAPTCHA"]', 'iframe[title*="hCaptcha"]',
      '[class*="captcha" i]', '#cf-turnstile', '.cf-turnstile',
    ];

    for (const sel of selectors) {
      try {
        const el = await this.page!.$(sel);
        if (el) return true;
      } catch {}
    }
    return false;
  }

  /**
   * Handle Cloudflare/Vercel security challenges
   */
  private async handleSecurityChallenge(platform: PlatformConfig): Promise<AutomationResult | null> {
    try {
      // Check for Cloudflare challenge page
      const pageText = await this.page!.textContent('body').catch(() => '');
      const title = await this.page!.title().catch(() => '');
      
      const isCloudflare = pageText?.includes('Checking your browser') || 
                           pageText?.includes('cloudflare') ||
                           title?.includes('Just a moment') ||
                           title?.includes('Attention Required');
      
      const isVercelChallenge = pageText?.includes('Vercel Security Checkpoint') ||
                                title?.includes('Vercel Security');
      
      if (isCloudflare || isVercelChallenge) {
        // Wait for challenge to auto-resolve (some do after 5 seconds)
        console.log(`[Engine] ${platform.name}: Security challenge detected, waiting for auto-resolve...`);
        await this.delay(5000, 8000);
        
        // Check if challenge resolved
        const newTitle = await this.page!.title().catch(() => '');
        const newText = await this.page!.textContent('body').catch(() => '');
        const stillChallenged = newTitle?.includes('Just a moment') || 
                                newText?.includes('Checking your browser') ||
                                newText?.includes('Vercel Security');
        
        if (stillChallenged) {
          const screenshot = await this.takeScreenshot();
          return {
            success: false,
            needsManualAction: true,
            manualActionDescription: `${platform.name} has a security challenge. Click "Open Platform" to pass it in your browser, then click "Done, Continue" to retry.`,
            actionUrl: this.page!.url() || platform.submitUrl,
            actionType: 'security_challenge',
            screenshotBase64: screenshot,
          };
        }
      }
    } catch {}
    return null;
  }

  // === HELPERS ===

  private async dismissOverlays(): Promise<void> {
    const dismissSelectors = [
      'button:has-text("Accept")', 'button:has-text("Accept All")',
      'button:has-text("Got it")', 'button:has-text("OK")',
      'button:has-text("I agree")', 'button:has-text("Close")',
      'button:has-text("Dismiss")', 'button:has-text("No thanks")',
      '[aria-label="Close"]', '[aria-label="close"]',
      'button.close', '.modal-close', '[data-dismiss="modal"]',
      '#onetrust-accept-btn-handler', // OneTrust cookie banner
      '.cookie-consent button', '[class*="cookie"] button',
    ];

    for (const sel of dismissSelectors) {
      try {
        const el = await this.page!.$(sel);
        if (el && await el.isVisible()) {
          await el.click();
          await this.delay(500, 1000);
          break; // One dismissal is usually enough
        }
      } catch {}
    }
  }

  private async checkForSuccess(): Promise<boolean> {
    const successIndicators = [
      ':has-text("success")', ':has-text("submitted")', ':has-text("thank you")',
      ':has-text("Thanks")', ':has-text("received")', ':has-text("review")',
      ':has-text("approved")', ':has-text("listed")', ':has-text("published")',
      '[class*="success"]', '[class*="alert-success"]',
      '[role="alert"]:has-text("success")',
    ];

    for (const sel of successIndicators) {
      try {
        const el = await this.page!.$(sel);
        if (el && await el.isVisible()) return true;
      } catch {}
    }
    return false;
  }

  private async checkForError(): Promise<boolean> {
    const errorIndicators = [
      '[class*="error"]:visible', '[class*="alert-danger"]:visible',
      '[role="alert"][class*="error"]', '.form-error:visible',
      '.field-error:visible', '.invalid-feedback:visible',
    ];

    for (const sel of errorIndicators) {
      try {
        const el = await this.page!.$(sel);
        if (el && await el.isVisible()) return true;
      } catch {}
    }
    return false;
  }

  private async getErrorText(): Promise<string> {
    const errorSels = [
      '[class*="error"]', '[role="alert"]', '.form-error', '.invalid-feedback',
    ];
    for (const sel of errorSels) {
      try {
        const el = await this.page!.$(sel);
        if (el && await el.isVisible()) {
          return (await el.textContent()) || '';
        }
      } catch {}
    }
    return '';
  }

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
      email: null, // User must store email in account credentials
    };
    return map[mapTo] || null;
  }

  private async takeScreenshot(): Promise<string> {
    if (!this.page) return '';
    try {
      const buffer = await this.page.screenshot({ type: 'jpeg', quality: 50, fullPage: false });
      return buffer.toString('base64');
    } catch {
      return '';
    }
  }

  private async delay(min: number, max: number): Promise<void> {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  private async cleanup(): Promise<void> {
    try {
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();
    } catch {}
    this.page = null;
    this.context = null;
    this.browser = null;
  }
}
