/**
 * Launch Pilot - Twitter/X Profile Creator
 * 
 * Automates creating and setting up a Twitter/X profile for a product.
 * Handles signup, profile editing, and bio setup.
 */

import { AutomationBrowser, createBrowser } from './browser';
import { Page } from 'playwright';

export interface TwitterProfileData {
  displayName: string;
  username?: string; // desired @handle
  bio: string;
  website: string;
  location?: string;
  profileImagePath?: string;
  headerImagePath?: string;
}

export interface TwitterCredentials {
  email: string;
  username: string;
  password: string;
}

export interface TwitterProfileResult {
  success: boolean;
  profileUrl?: string;
  error?: string;
  screenshotPath?: string;
  needsManualAction?: boolean;
  manualActionDescription?: string;
}

export class TwitterProfileCreator {
  private browser: AutomationBrowser;
  private page: Page | null = null;

  constructor() {
    this.browser = createBrowser({
      headless: false,
      slowMo: 90,
    });
  }

  /**
   * Full flow: Login -> Edit Profile
   */
  async setupProfile(
    credentials: TwitterCredentials,
    profileData: TwitterProfileData
  ): Promise<TwitterProfileResult> {
    try {
      this.page = await this.browser.launch();

      // Step 1: Login
      const loginResult = await this.login(credentials);
      if (!loginResult.success) return loginResult;

      // Step 2: Edit profile
      await this.browser.randomDelay(2000, 4000);
      const editResult = await this.editProfile(profileData);

      return editResult;
    } catch (error: any) {
      const screenshotPath = await this.browser.screenshot('twitter-error');
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
   * Login to Twitter/X
   */
  private async login(credentials: TwitterCredentials): Promise<TwitterProfileResult> {
    await this.browser.goto('https://x.com/i/flow/login');
    await this.browser.randomDelay(2000, 4000);

    // Check if already logged in
    const isLoggedIn = await this.browser.elementExists('[data-testid="primaryColumn"]') ||
                       await this.browser.elementExists('[aria-label="Home timeline"]');
    if (isLoggedIn) {
      return { success: true };
    }

    // Enter email/username
    const usernameInput = await this.browser.elementExists('input[autocomplete="username"]');
    if (usernameInput) {
      await this.browser.humanType('input[autocomplete="username"]', credentials.email);
      await this.browser.randomDelay(500, 1000);

      // Click Next
      const nextBtn = await this.browser.elementExists('[role="button"]:has-text("Next")');
      if (nextBtn) {
        await this.browser.humanClick('[role="button"]:has-text("Next")');
        await this.browser.randomDelay(1500, 3000);
      }
    }

    // Sometimes Twitter asks for username verification
    const usernameVerify = await this.browser.elementExists('input[data-testid="ocfEnterTextTextInput"]');
    if (usernameVerify) {
      await this.browser.humanType('input[data-testid="ocfEnterTextTextInput"]', credentials.username);
      await this.browser.randomDelay(500, 1000);
      const nextBtn2 = await this.browser.elementExists('[data-testid="ocfEnterTextNextButton"]');
      if (nextBtn2) {
        await this.browser.humanClick('[data-testid="ocfEnterTextNextButton"]');
        await this.browser.randomDelay(1500, 3000);
      }
    }

    // Enter password
    const passwordInput = await this.browser.elementExists('input[name="password"], input[type="password"]');
    if (passwordInput) {
      await this.browser.humanType('input[name="password"], input[type="password"]', credentials.password);
      await this.browser.randomDelay(500, 1000);

      // Click Log in
      const loginBtn = await this.browser.elementExists('[data-testid="LoginForm_Login_Button"]');
      if (loginBtn) {
        await this.browser.humanClick('[data-testid="LoginForm_Login_Button"]');
      } else {
        await this.browser.humanClick('[role="button"]:has-text("Log in")');
      }
      await this.browser.waitForNavigation();
      await this.browser.randomDelay(3000, 5000);
    }

    // Check for challenges
    const hasChallenge = await this.browser.elementExists('[data-testid="ocfEnterTextTextInput"]') ||
                         await this.browser.elementExists('input[name="verification_code"]');
    if (hasChallenge) {
      const screenshotPath = await this.browser.screenshot('twitter-verification');
      return {
        success: false,
        needsManualAction: true,
        manualActionDescription: 'Twitter requires additional verification. Please complete manually.',
        screenshotPath,
      };
    }

    // Verify login success
    await this.browser.randomDelay(2000, 3000);
    const loginSuccess = await this.browser.elementExists('[data-testid="primaryColumn"]') ||
                         await this.browser.elementExists('[aria-label="Home timeline"]') ||
                         this.page!.url().includes('/home');

    if (!loginSuccess) {
      const screenshotPath = await this.browser.screenshot('twitter-login-failed');
      return {
        success: false,
        error: 'Twitter login failed',
        screenshotPath,
      };
    }

    return { success: true };
  }

  /**
   * Edit Twitter profile with product info
   */
  private async editProfile(profileData: TwitterProfileData): Promise<TwitterProfileResult> {
    // Navigate to profile
    await this.browser.goto('https://x.com/settings/profile');
    await this.browser.randomDelay(2000, 3000);

    // Alternatively, go to profile and click Edit
    const editProfileBtn = await this.browser.elementExists('[data-testid="editProfileButton"]');
    if (!editProfileBtn) {
      // Try direct profile page
      await this.browser.goto('https://x.com/home');
      await this.browser.randomDelay(1000, 2000);
      await this.browser.humanClick('[data-testid="AppTabBar_Profile_Link"]');
      await this.browser.randomDelay(2000, 3000);
      await this.browser.humanClick('[data-testid="editProfileButton"]');
      await this.browser.randomDelay(2000, 3000);
    }

    // Upload profile image
    if (profileData.profileImagePath) {
      const avatarInput = await this.browser.elementExists('input[data-testid="fileInput"][accept*="image"]');
      if (avatarInput) {
        await this.browser.uploadFile('input[data-testid="fileInput"]', profileData.profileImagePath);
        await this.browser.randomDelay(2000, 4000);
        // Apply/save the image
        const applyBtn = await this.browser.elementExists('[data-testid="applyButton"]');
        if (applyBtn) {
          await this.browser.humanClick('[data-testid="applyButton"]');
          await this.browser.randomDelay(1000, 2000);
        }
      }
    }

    // Upload header image
    if (profileData.headerImagePath) {
      const headerUpload = await this.browser.elementExists('[aria-label="Add banner photo"]');
      if (headerUpload) {
        await this.browser.humanClick('[aria-label="Add banner photo"]');
        await this.browser.randomDelay(1000, 2000);
        await this.browser.uploadFile('input[type="file"]', profileData.headerImagePath);
        await this.browser.randomDelay(2000, 4000);
        const applyBtn = await this.browser.elementExists('[data-testid="applyButton"]');
        if (applyBtn) {
          await this.browser.humanClick('[data-testid="applyButton"]');
          await this.browser.randomDelay(1000, 2000);
        }
      }
    }

    // Display name
    const nameInput = await this.browser.elementExists('input[name="displayName"], input[data-testid="name"]');
    if (nameInput) {
      await this.browser.humanType('input[name="displayName"], input[data-testid="name"]', profileData.displayName, { clearFirst: true });
      await this.browser.randomDelay(500, 1000);
    }

    // Bio
    const bioInput = await this.browser.elementExists('textarea[name="description"], textarea[data-testid="bio"]');
    if (bioInput) {
      await this.browser.humanType('textarea[name="description"], textarea[data-testid="bio"]', profileData.bio.substring(0, 160), { clearFirst: true });
      await this.browser.randomDelay(500, 1000);
    }

    // Location
    if (profileData.location) {
      const locationInput = await this.browser.elementExists('input[name="location"], input[data-testid="location"]');
      if (locationInput) {
        await this.browser.humanType('input[name="location"], input[data-testid="location"]', profileData.location, { clearFirst: true });
        await this.browser.randomDelay(500, 1000);
      }
    }

    // Website
    const websiteInput = await this.browser.elementExists('input[name="url"], input[data-testid="url"]');
    if (websiteInput) {
      await this.browser.humanType('input[name="url"], input[data-testid="url"]', profileData.website, { clearFirst: true });
      await this.browser.randomDelay(500, 1000);
    }

    // Save profile
    const saveBtn = await this.browser.elementExists('[data-testid="Profile_Save_Button"], button:has-text("Save")');
    if (saveBtn) {
      await this.browser.humanClick('[data-testid="Profile_Save_Button"], button:has-text("Save")');
      await this.browser.randomDelay(2000, 3000);
    }

    const currentUrl = this.page!.url();
    const profileUrl = currentUrl.includes('x.com/') ? currentUrl : undefined;

    return {
      success: true,
      profileUrl,
    };
  }
}

/**
 * Quick helper to set up a Twitter profile
 */
export async function setupTwitterProfile(
  credentials: TwitterCredentials,
  profileData: TwitterProfileData
): Promise<TwitterProfileResult> {
  const creator = new TwitterProfileCreator();
  return creator.setupProfile(credentials, profileData);
}
