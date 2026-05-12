/**
 * Launch Pilot - Facebook Business Page Creator
 * 
 * Automates creating a Facebook Business Page for a product.
 * Handles login, page creation, and profile setup.
 */

import { AutomationBrowser, createBrowser } from './browser';
import { Page } from 'playwright';

export interface FacebookPageData {
  pageName: string;
  category: string; // e.g., "Software Company", "App Page", "Product/Service"
  description: string;
  website: string;
  email?: string;
  phone?: string;
  address?: string;
  logoPath?: string;
  coverImagePath?: string;
}

export interface FacebookCredentials {
  email: string;
  password: string;
}

export interface FacebookPageResult {
  success: boolean;
  pageUrl?: string;
  pageId?: string;
  error?: string;
  screenshotPath?: string;
  needsManualAction?: boolean;
  manualActionDescription?: string;
}

export class FacebookPageCreator {
  private browser: AutomationBrowser;
  private page: Page | null = null;

  constructor() {
    this.browser = createBrowser({
      headless: false, // Facebook detects headless browsers
      slowMo: 80,
    });
  }

  /**
   * Full flow: Login -> Create Page -> Setup Profile
   */
  async createPage(credentials: FacebookCredentials, pageData: FacebookPageData): Promise<FacebookPageResult> {
    try {
      this.page = await this.browser.launch();

      // Step 1: Login to Facebook
      const loginResult = await this.login(credentials);
      if (!loginResult.success) return loginResult;

      // Step 2: Navigate to page creation
      await this.browser.randomDelay(2000, 4000);
      await this.browser.goto('https://www.facebook.com/pages/creation/');

      // Step 3: Fill page creation form
      const createResult = await this.fillPageForm(pageData);
      if (!createResult.success) return createResult;

      // Step 4: Upload images and finalize
      await this.browser.randomDelay(2000, 4000);
      const setupResult = await this.setupPageProfile(pageData);

      return setupResult;
    } catch (error: any) {
      const screenshotPath = await this.browser.screenshot('facebook-error');
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
   * Login to Facebook
   */
  private async login(credentials: FacebookCredentials): Promise<FacebookPageResult> {
    await this.browser.goto('https://www.facebook.com/login');
    await this.browser.randomDelay(1000, 2000);

    // Check if already logged in
    const isLoggedIn = await this.browser.elementExists('[aria-label="Your profile"]') ||
                       await this.browser.elementExists('[data-pagelet="LeftRail"]');
    if (isLoggedIn) {
      return { success: true };
    }

    // Fill login form
    await this.browser.humanType('#email', credentials.email);
    await this.browser.randomDelay(500, 1000);
    await this.browser.humanType('#pass', credentials.password);
    await this.browser.randomDelay(500, 1500);

    // Click login button
    await this.browser.humanClick('button[name="login"]');
    await this.browser.waitForNavigation();
    await this.browser.randomDelay(2000, 4000);

    // Check for CAPTCHA
    const captcha = await this.browser.detectCaptcha();
    if (captcha.hasCaptcha) {
      const screenshotPath = await this.browser.screenshot('facebook-captcha');
      return {
        success: false,
        needsManualAction: true,
        manualActionDescription: 'Facebook CAPTCHA detected during login. Please solve manually.',
        screenshotPath,
      };
    }

    // Check for 2FA / checkpoint
    const hasCheckpoint = await this.browser.elementExists('#approvals_code') ||
                          await this.browser.elementExists('[id*="checkpoint"]');
    if (hasCheckpoint) {
      const screenshotPath = await this.browser.screenshot('facebook-2fa');
      return {
        success: false,
        needsManualAction: true,
        manualActionDescription: 'Facebook requires 2FA verification. Please complete manually.',
        screenshotPath,
      };
    }

    // Verify login success
    await this.browser.randomDelay(2000, 3000);
    const success = await this.browser.elementExists('[aria-label="Your profile"]') ||
                    await this.browser.elementExists('[data-pagelet="LeftRail"]') ||
                    this.page!.url().includes('facebook.com/?');

    if (!success) {
      const screenshotPath = await this.browser.screenshot('facebook-login-failed');
      return {
        success: false,
        error: 'Facebook login failed - could not verify successful authentication',
        screenshotPath,
      };
    }

    return { success: true };
  }

  /**
   * Fill the Facebook Page creation form
   */
  private async fillPageForm(pageData: FacebookPageData): Promise<FacebookPageResult> {
    await this.browser.randomDelay(2000, 3000);

    // Page name
    const nameInput = 'input[name="page_name"], input[aria-label="Page name"]';
    await this.browser.humanType(nameInput, pageData.pageName);
    await this.browser.randomDelay(500, 1000);

    // Category - typeahead field
    const categoryInput = 'input[name="category"], input[aria-label="Category"]';
    const hasCategoryInput = await this.browser.elementExists(categoryInput);
    if (hasCategoryInput) {
      await this.browser.humanType(categoryInput, pageData.category);
      await this.browser.randomDelay(1500, 2500);
      // Select from dropdown
      const suggestion = await this.browser.elementExists('[role="option"], [role="listbox"] li');
      if (suggestion) {
        await this.browser.humanClick('[role="option"]:first-child, [role="listbox"] li:first-child');
        await this.browser.randomDelay(500, 1000);
      }
    }

    // Description / Bio
    const bioInput = 'textarea[name="biography"], textarea[aria-label="Bio"]';
    const hasBio = await this.browser.elementExists(bioInput);
    if (hasBio) {
      await this.browser.humanType(bioInput, pageData.description.substring(0, 255));
      await this.browser.randomDelay(500, 1000);
    }

    // Website (if visible at this step)
    const websiteInput = 'input[name="website"], input[aria-label="Website"]';
    const hasWebsite = await this.browser.elementExists(websiteInput);
    if (hasWebsite) {
      await this.browser.humanType(websiteInput, pageData.website);
      await this.browser.randomDelay(500, 1000);
    }

    // Click "Create Page" button
    const createBtn = 'button:has-text("Create Page"), [aria-label="Create Page"]';
    await this.browser.humanClick(createBtn);
    await this.browser.waitForNavigation();
    await this.browser.randomDelay(3000, 5000);

    // Check for errors
    const hasError = await this.browser.elementExists('[role="alert"]');
    if (hasError) {
      const errorText = await this.browser.getText('[role="alert"]');
      const screenshotPath = await this.browser.screenshot('facebook-create-error');
      return {
        success: false,
        error: `Page creation failed: ${errorText}`,
        screenshotPath,
      };
    }

    return { success: true };
  }

  /**
   * Setup page profile with logo and cover image
   */
  private async setupPageProfile(pageData: FacebookPageData): Promise<FacebookPageResult> {
    // Upload profile picture (logo)
    if (pageData.logoPath) {
      const addProfilePic = await this.browser.elementExists('[aria-label="Add profile picture"], button:has-text("Add Profile Photo")');
      if (addProfilePic) {
        await this.browser.humanClick('[aria-label="Add profile picture"], button:has-text("Add Profile Photo")');
        await this.browser.randomDelay(1000, 2000);
        await this.browser.uploadFile('input[type="file"]', pageData.logoPath);
        await this.browser.randomDelay(3000, 5000);
        // Save/confirm
        const saveBtn = await this.browser.elementExists('button:has-text("Save")');
        if (saveBtn) {
          await this.browser.humanClick('button:has-text("Save")');
          await this.browser.randomDelay(2000, 3000);
        }
      }
    }

    // Upload cover photo
    if (pageData.coverImagePath) {
      const addCover = await this.browser.elementExists('[aria-label="Add cover photo"], button:has-text("Add Cover Photo")');
      if (addCover) {
        await this.browser.humanClick('[aria-label="Add cover photo"], button:has-text("Add Cover Photo")');
        await this.browser.randomDelay(1000, 2000);

        const uploadOption = await this.browser.elementExists('button:has-text("Upload Photo")');
        if (uploadOption) {
          await this.browser.humanClick('button:has-text("Upload Photo")');
          await this.browser.randomDelay(500, 1000);
        }

        await this.browser.uploadFile('input[type="file"]', pageData.coverImagePath);
        await this.browser.randomDelay(3000, 5000);
        const saveBtn = await this.browser.elementExists('button:has-text("Save")');
        if (saveBtn) {
          await this.browser.humanClick('button:has-text("Save")');
          await this.browser.randomDelay(2000, 3000);
        }
      }
    }

    // Add website and contact info
    const editInfo = await this.browser.elementExists('a:has-text("Edit Page Info"), button:has-text("Edit")');
    if (editInfo) {
      await this.browser.humanClick('a:has-text("Edit Page Info"), button:has-text("Edit")');
      await this.browser.randomDelay(2000, 3000);

      if (pageData.website) {
        const websiteField = await this.browser.elementExists('input[name="website"]');
        if (websiteField) {
          await this.browser.humanType('input[name="website"]', pageData.website);
        }
      }

      if (pageData.email) {
        const emailField = await this.browser.elementExists('input[name="email"]');
        if (emailField) {
          await this.browser.humanType('input[name="email"]', pageData.email);
        }
      }

      // Save changes
      const saveChanges = await this.browser.elementExists('button:has-text("Save")');
      if (saveChanges) {
        await this.browser.humanClick('button:has-text("Save")');
        await this.browser.randomDelay(2000, 3000);
      }
    }

    // Get the page URL
    const currentUrl = this.page!.url();

    return {
      success: true,
      pageUrl: currentUrl,
    };
  }
}

/**
 * Quick helper to create a Facebook page
 */
export async function createFacebookPage(
  credentials: FacebookCredentials,
  pageData: FacebookPageData
): Promise<FacebookPageResult> {
  const creator = new FacebookPageCreator();
  return creator.createPage(credentials, pageData);
}
