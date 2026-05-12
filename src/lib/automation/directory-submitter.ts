/**
 * Launch Pilot - Directory Submission Engine
 * 
 * Generic automation engine that reads platform configs from the registry
 * and submits products to directories, listings, and review sites.
 */

import { AutomationBrowser, createBrowser } from './browser';
import { PlatformConfig, PlatformField, getPlatformById } from '../platforms/registry';
import { Page } from 'playwright';

export interface ProductData {
  name: string;
  tagline: string;
  description: string;
  url: string;
  email?: string;
  logo?: string; // file path
  screenshots?: string[]; // file paths
  category?: string;
  keywords?: string;
  pricing?: string;
}

export interface SubmissionCredentials {
  username: string;
  password: string;
}

export interface SubmissionResult {
  platformId: string;
  platformName: string;
  success: boolean;
  submittedUrl?: string;
  error?: string;
  screenshotPath?: string;
  needsManualAction?: boolean;
  manualActionDescription?: string;
  needsCaptcha?: boolean;
  timestamp: Date;
}

export class DirectorySubmitter {
  private browser: AutomationBrowser;
  private page: Page | null = null;

  constructor() {
    this.browser = createBrowser({
      headless: false,
      slowMo: 80,
    });
  }

  /**
   * Submit to a single platform
   */
  async submitToPlatform(
    platformId: string,
    product: ProductData,
    credentials?: SubmissionCredentials
  ): Promise<SubmissionResult> {
    const platform = getPlatformById(platformId);
    if (!platform) {
      return {
        platformId,
        platformName: platformId,
        success: false,
        error: `Platform "${platformId}" not found in registry`,
        timestamp: new Date(),
      };
    }

    try {
      this.page = await this.browser.launch();

      // Step 1: Login if required
      if (platform.loginRequired && credentials) {
        const loginResult = await this.loginToPlatform(platform, credentials);
        if (!loginResult.success) {
          return {
            ...loginResult,
            platformId: platform.id,
            platformName: platform.name,
            timestamp: new Date(),
          };
        }
      }

      // Step 2: Navigate to submission page
      await this.browser.randomDelay(1500, 3000);
      await this.browser.goto(platform.submitUrl);
      await this.browser.randomDelay(2000, 4000);

      // Step 3: Check for CAPTCHA
      if (platform.hasCaptcha) {
        const captcha = await this.browser.detectCaptcha();
        if (captcha.hasCaptcha) {
          const screenshotPath = await this.browser.screenshot(`${platform.id}-captcha`);
          return {
            platformId: platform.id,
            platformName: platform.name,
            success: false,
            needsCaptcha: true,
            needsManualAction: true,
            manualActionDescription: `${platform.name} has a ${captcha.type} CAPTCHA. Form is filled, please solve CAPTCHA and submit.`,
            screenshotPath,
            timestamp: new Date(),
          };
        }
      }

      // Step 4: Fill the form
      await this.fillForm(platform, product);

      // Step 5: Submit
      const submitResult = await this.submitForm(platform);

      return {
        platformId: platform.id,
        platformName: platform.name,
        ...submitResult,
        timestamp: new Date(),
      };
    } catch (error: any) {
      const screenshotPath = await this.browser.screenshot(`${platformId}-error`);
      return {
        platformId: platform?.id || platformId,
        platformName: platform?.name || platformId,
        success: false,
        error: error.message,
        screenshotPath,
        timestamp: new Date(),
      };
    } finally {
      await this.browser.close();
    }
  }

  /**
   * Submit to multiple platforms sequentially with delays
   */
  async submitToMultiple(
    platformIds: string[],
    product: ProductData,
    credentials: Record<string, SubmissionCredentials>,
    delayBetweenMinutes = 5
  ): Promise<SubmissionResult[]> {
    const results: SubmissionResult[] = [];

    for (let i = 0; i < platformIds.length; i++) {
      const platformId = platformIds[i];
      const creds = credentials[platformId];

      console.log(`[${i + 1}/${platformIds.length}] Submitting to ${platformId}...`);

      const result = await this.submitToPlatform(platformId, product, creds);
      results.push(result);

      console.log(`  Result: ${result.success ? 'SUCCESS' : 'FAILED'} ${result.error || ''}`);

      // Delay between submissions to look natural
      if (i < platformIds.length - 1) {
        const delayMs = (delayBetweenMinutes * 60 * 1000) + (Math.random() * 2 * 60 * 1000);
        console.log(`  Waiting ${Math.round(delayMs / 1000 / 60)} minutes before next submission...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }

  /**
   * Generic login to a platform
   */
  private async loginToPlatform(
    platform: PlatformConfig,
    credentials: SubmissionCredentials
  ): Promise<Partial<SubmissionResult>> {
    // Navigate to the platform's main URL first
    await this.browser.goto(platform.url);
    await this.browser.randomDelay(1500, 3000);

    // Look for login link
    const loginSelectors = [
      'a:has-text("Log in")',
      'a:has-text("Login")',
      'a:has-text("Sign in")',
      'a:has-text("Sign In")',
      'button:has-text("Log in")',
      'button:has-text("Sign in")',
      '[href*="/login"]',
      '[href*="/signin"]',
    ];

    for (const selector of loginSelectors) {
      const hasLogin = await this.browser.elementExists(selector);
      if (hasLogin) {
        await this.browser.humanClick(selector);
        await this.browser.waitForNavigation();
        await this.browser.randomDelay(2000, 3000);
        break;
      }
    }

    // Find and fill login form
    const emailSelectors = ['input[name="email"]', 'input[type="email"]', 'input[name="username"]', 'input[name="login"]', '#email', '#username'];
    const passwordSelectors = ['input[name="password"]', 'input[type="password"]', '#password'];

    let emailField: string | null = null;
    let passwordField: string | null = null;

    for (const selector of emailSelectors) {
      if (await this.browser.elementExists(selector)) {
        emailField = selector;
        break;
      }
    }

    for (const selector of passwordSelectors) {
      if (await this.browser.elementExists(selector)) {
        passwordField = selector;
        break;
      }
    }

    if (!emailField || !passwordField) {
      return {
        success: false,
        error: `Could not find login form on ${platform.name}`,
      };
    }

    await this.browser.humanType(emailField, credentials.username);
    await this.browser.randomDelay(500, 1000);
    await this.browser.humanType(passwordField, credentials.password);
    await this.browser.randomDelay(500, 1500);

    // Submit login form
    const submitSelectors = ['button[type="submit"]', 'input[type="submit"]', 'button:has-text("Log in")', 'button:has-text("Sign in")'];
    for (const selector of submitSelectors) {
      if (await this.browser.elementExists(selector)) {
        await this.browser.humanClick(selector);
        break;
      }
    }

    await this.browser.waitForNavigation();
    await this.browser.randomDelay(2000, 4000);

    // Check for CAPTCHA after login attempt
    const captcha = await this.browser.detectCaptcha();
    if (captcha.hasCaptcha) {
      const screenshotPath = await this.browser.screenshot(`${platform.id}-login-captcha`);
      return {
        success: false,
        needsCaptcha: true,
        needsManualAction: true,
        manualActionDescription: `${platform.name} login has CAPTCHA. Please solve manually.`,
        screenshotPath,
      };
    }

    return { success: true };
  }

  /**
   * Fill form fields based on platform config
   */
  private async fillForm(platform: PlatformConfig, product: ProductData): Promise<void> {
    for (const field of platform.fields) {
      const value = this.getFieldValue(field, product);
      if (!value) continue;

      try {
        const exists = await this.browser.elementExists(field.selector);
        if (!exists) continue;

        switch (field.type) {
          case 'text':
          case 'url':
          case 'email':
            await this.browser.humanType(field.selector, value);
            break;
          case 'textarea':
            await this.browser.humanType(field.selector, field.maxLength ? value.substring(0, field.maxLength) : value);
            break;
          case 'select':
            await this.browser.selectOption(field.selector, value);
            break;
          case 'file':
            if (product.logo) {
              await this.browser.uploadFile(field.selector, product.logo);
            }
            break;
          case 'checkbox':
            await this.browser.humanClick(field.selector);
            break;
        }

        await this.browser.randomDelay(500, 1500);
      } catch (error) {
        console.warn(`Could not fill field "${field.name}" on ${platform.name}: ${error}`);
      }
    }
  }

  /**
   * Map product data to form field
   */
  private getFieldValue(field: PlatformField, product: ProductData): string | null {
    const mapping: Record<string, string | undefined> = {
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      url: product.url,
      email: product.email,
      category: product.category,
      keywords: product.keywords,
      pricing: product.pricing,
      logo: product.logo,
    };

    return mapping[field.mapTo] || null;
  }

  /**
   * Submit the form
   */
  private async submitForm(platform: PlatformConfig): Promise<Partial<SubmissionResult>> {
    // Find submit button
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Submit")',
      'button:has-text("Create")',
      'button:has-text("Add")',
      'button:has-text("Publish")',
      'button:has-text("Launch")',
      'button:has-text("Send")',
    ];

    let submitted = false;
    for (const selector of submitSelectors) {
      const exists = await this.browser.elementExists(selector);
      if (exists) {
        // Check for CAPTCHA one more time before submitting
        const captcha = await this.browser.detectCaptcha();
        if (captcha.hasCaptcha) {
          const screenshotPath = await this.browser.screenshot(`${platform.id}-submit-captcha`);
          return {
            success: false,
            needsCaptcha: true,
            needsManualAction: true,
            manualActionDescription: `Form filled on ${platform.name}. CAPTCHA present - please solve and click submit.`,
            screenshotPath,
          };
        }

        await this.browser.humanClick(selector);
        submitted = true;
        break;
      }
    }

    if (!submitted) {
      const screenshotPath = await this.browser.screenshot(`${platform.id}-no-submit`);
      return {
        success: false,
        needsManualAction: true,
        manualActionDescription: `Form filled on ${platform.name} but could not find submit button. Please submit manually.`,
        screenshotPath,
      };
    }

    await this.browser.waitForNavigation();
    await this.browser.randomDelay(3000, 5000);

    // Check for success indicators
    const successIndicators = [
      ':has-text("success")',
      ':has-text("submitted")',
      ':has-text("thank you")',
      ':has-text("review")',
      '[class*="success"]',
      '[class*="alert-success"]',
    ];

    for (const selector of successIndicators) {
      if (await this.browser.elementExists(selector)) {
        const screenshotPath = await this.browser.screenshot(`${platform.id}-success`);
        return {
          success: true,
          submittedUrl: this.page!.url(),
          screenshotPath,
        };
      }
    }

    // If no clear success/error, assume it worked if page changed
    const screenshotPath = await this.browser.screenshot(`${platform.id}-submitted`);
    return {
      success: true,
      submittedUrl: this.page!.url(),
      screenshotPath,
    };
  }
}

/**
 * Quick helper to submit to a single platform
 */
export async function submitToDirectory(
  platformId: string,
  product: ProductData,
  credentials?: SubmissionCredentials
): Promise<SubmissionResult> {
  const submitter = new DirectorySubmitter();
  return submitter.submitToPlatform(platformId, product, credentials);
}
