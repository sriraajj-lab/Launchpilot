/**
 * Launch Pilot - LinkedIn Company Page Creator
 * 
 * Automates creating a LinkedIn Company Page for a product.
 * Handles login, page creation form, and profile setup.
 */

import { AutomationBrowser, createBrowser } from './browser';
import type { Page } from 'playwright';

export interface LinkedInPageData {
  companyName: string;
  linkedinUrl?: string; // vanity URL
  website: string;
  industry: string;
  companySize: string; // '2-10', '11-50', '51-200', etc.
  companyType: string; // 'Privately Held', 'Public Company', 'Self-Employed', etc.
  tagline: string;
  description: string;
  logoPath?: string;
  coverImagePath?: string;
}

export interface LinkedInCredentials {
  email: string;
  password: string;
}

export interface LinkedInPageResult {
  success: boolean;
  pageUrl?: string;
  error?: string;
  screenshotPath?: string;
  needsManualAction?: boolean;
  manualActionDescription?: string;
}

export class LinkedInPageCreator {
  private browser: AutomationBrowser;
  private page: Page | null = null;

  constructor() {
    this.browser = createBrowser({
      headless: false, // LinkedIn heavily detects headless
      slowMo: 100,
    });
  }

  /**
   * Full flow: Login -> Create Page -> Setup Profile
   */
  async createPage(credentials: LinkedInCredentials, pageData: LinkedInPageData): Promise<LinkedInPageResult> {
    try {
      this.page = await this.browser.launch();

      // Step 1: Login to LinkedIn
      const loginResult = await this.login(credentials);
      if (!loginResult.success) {
        return loginResult;
      }

      // Step 2: Navigate to page creation
      await this.browser.randomDelay(2000, 4000);
      await this.browser.goto('https://www.linkedin.com/company/setup/new/');

      // Step 3: Fill page creation form
      const createResult = await this.fillPageCreationForm(pageData);
      if (!createResult.success) {
        return createResult;
      }

      // Step 4: Setup page profile (logo, cover, about)
      await this.browser.randomDelay(3000, 5000);
      const setupResult = await this.setupPageProfile(pageData);

      return setupResult;
    } catch (error: any) {
      const screenshotPath = await this.browser.screenshot('linkedin-error');
      return {
        success: false,
        error: error.message,
        screenshotPath,
      };
    } finally {
      await this.browser.close();
    }
  }

  /**
   * Login to LinkedIn
   */
  private async login(credentials: LinkedInCredentials): Promise<LinkedInPageResult> {
    await this.browser.goto('https://www.linkedin.com/login');
    await this.browser.randomDelay(1000, 2000);

    // Check if already logged in
    const isLoggedIn = await this.browser.elementExists('[data-test-id="nav-item"]') ||
                       await this.browser.elementExists('.global-nav');
    if (isLoggedIn) {
      return { success: true };
    }

    // Fill login form
    await this.browser.humanType('#username', credentials.email);
    await this.browser.randomDelay(500, 1000);
    await this.browser.humanType('#password', credentials.password);
    await this.browser.randomDelay(500, 1500);

    // Click sign in
    await this.browser.humanClick('button[type="submit"]');
    await this.browser.waitForNavigation();

    // Check for CAPTCHA or verification
    const captcha = await this.browser.detectCaptcha();
    if (captcha.hasCaptcha) {
      const screenshotPath = await this.browser.screenshot('linkedin-captcha');
      return {
        success: false,
        needsManualAction: true,
        manualActionDescription: 'LinkedIn CAPTCHA detected during login. Please solve manually.',
        screenshotPath,
      };
    }

    // Check for security verification (phone/email)
    const hasVerification = await this.browser.elementExists('#input__email_verification_pin') ||
                            await this.browser.elementExists('[data-test-id="challenge"]');
    if (hasVerification) {
      const screenshotPath = await this.browser.screenshot('linkedin-verification');
      return {
        success: false,
        needsManualAction: true,
        manualActionDescription: 'LinkedIn requires email/phone verification. Please complete manually.',
        screenshotPath,
      };
    }

    // Verify successful login
    await this.browser.randomDelay(2000, 3000);
    const loginSuccess = await this.browser.elementExists('.global-nav') ||
                         await this.browser.elementExists('[data-test-id="nav-item"]');

    if (!loginSuccess) {
      const screenshotPath = await this.browser.screenshot('linkedin-login-failed');
      return {
        success: false,
        error: 'Login failed - could not verify successful authentication',
        screenshotPath,
      };
    }

    return { success: true };
  }

  /**
   * Fill the LinkedIn Company Page creation form
   */
  private async fillPageCreationForm(pageData: LinkedInPageData): Promise<LinkedInPageResult> {
    await this.browser.randomDelay(2000, 3000);

    // Select "Company" type (not showcase)
    const companyOption = await this.browser.elementExists('[data-test-id="setup-company"]');
    if (companyOption) {
      await this.browser.humanClick('[data-test-id="setup-company"]');
      await this.browser.randomDelay(1000, 2000);
    }

    // Company name
    await this.browser.humanType('input[name="name"]', pageData.companyName);
    await this.browser.randomDelay(500, 1000);

    // LinkedIn URL (vanity)
    if (pageData.linkedinUrl) {
      const urlInput = await this.browser.elementExists('input[name="publicIdentifier"]');
      if (urlInput) {
        await this.browser.humanType('input[name="publicIdentifier"]', pageData.linkedinUrl, { clearFirst: true });
      }
    }

    // Website
    await this.browser.humanType('input[name="website"]', pageData.website);
    await this.browser.randomDelay(500, 1000);

    // Industry - usually a typeahead/dropdown
    const industryInput = await this.browser.elementExists('input[name="industry"]') ||
                          await this.browser.elementExists('[data-test-id="industry-input"]');
    if (industryInput) {
      await this.browser.humanType('input[name="industry"]', pageData.industry);
      await this.browser.randomDelay(1000, 2000);
      // Select first dropdown option
      const dropdown = await this.browser.elementExists('.basic-typeahead__selectable');
      if (dropdown) {
        await this.browser.humanClick('.basic-typeahead__selectable:first-child');
      }
    }

    // Company size dropdown
    const sizeSelect = await this.browser.elementExists('select[name="companySize"]');
    if (sizeSelect) {
      await this.browser.selectOption('select[name="companySize"]', pageData.companySize);
    }

    // Company type dropdown
    const typeSelect = await this.browser.elementExists('select[name="companyType"]');
    if (typeSelect) {
      await this.browser.selectOption('select[name="companyType"]', pageData.companyType);
    }

    // Tagline
    const taglineInput = await this.browser.elementExists('input[name="tagline"]') ||
                         await this.browser.elementExists('textarea[name="tagline"]');
    if (taglineInput) {
      const selector = await this.browser.elementExists('textarea[name="tagline"]')
        ? 'textarea[name="tagline"]'
        : 'input[name="tagline"]';
      await this.browser.humanType(selector, pageData.tagline);
    }

    // Agree to terms checkbox
    const checkbox = await this.browser.elementExists('input[type="checkbox"]');
    if (checkbox) {
      await this.browser.humanClick('input[type="checkbox"]');
      await this.browser.randomDelay(300, 600);
    }

    // Submit - Click "Create page"
    await this.browser.humanClick('button[type="submit"]');
    await this.browser.waitForNavigation();
    await this.browser.randomDelay(3000, 5000);

    // Check for errors
    const errorMsg = await this.browser.elementExists('.artdeco-inline-feedback--error');
    if (errorMsg) {
      const errorText = await this.browser.getText('.artdeco-inline-feedback--error');
      const screenshotPath = await this.browser.screenshot('linkedin-create-error');
      return {
        success: false,
        error: `Page creation failed: ${errorText}`,
        screenshotPath,
      };
    }

    return { success: true };
  }

  /**
   * Setup the page profile (logo, cover, description)
   */
  private async setupPageProfile(pageData: LinkedInPageData): Promise<LinkedInPageResult> {
    // Upload logo
    if (pageData.logoPath) {
      const logoInput = await this.browser.elementExists('input[type="file"]');
      if (logoInput) {
        await this.browser.uploadFile('input[type="file"]', pageData.logoPath);
        await this.browser.randomDelay(2000, 4000);
        // Confirm/save the image
        const saveBtn = await this.browser.elementExists('button[data-test-id="save-btn"]');
        if (saveBtn) {
          await this.browser.humanClick('button[data-test-id="save-btn"]');
        }
      }
    }

    // Add description/about section
    const editAbout = await this.browser.elementExists('[data-test-id="edit-about"]') ||
                      await this.browser.elementExists('button:has-text("Add description")');
    if (editAbout && pageData.description) {
      await this.browser.humanClick('[data-test-id="edit-about"], button:has-text("Add description")');
      await this.browser.randomDelay(1000, 2000);
      await this.browser.humanType('textarea[name="description"]', pageData.description);
      await this.browser.randomDelay(500, 1000);
      await this.browser.humanClick('button[type="submit"]');
      await this.browser.randomDelay(2000, 3000);
    }

    // Get the page URL
    const currentUrl = this.page!.url();
    const pageUrl = currentUrl.includes('/company/') ? currentUrl : undefined;

    return {
      success: true,
      pageUrl,
    };
  }
}

/**
 * Quick helper to create a LinkedIn page
 */
export async function createLinkedInPage(
  credentials: LinkedInCredentials,
  pageData: LinkedInPageData
): Promise<LinkedInPageResult> {
  const creator = new LinkedInPageCreator();
  return creator.createPage(credentials, pageData);
}
