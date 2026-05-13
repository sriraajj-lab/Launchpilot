/**
 * Launch Pilot - Instagram Business Profile Creator
 * 
 * Automates creating/converting an Instagram Business Account.
 * Uses mobile web emulation for realistic behavior.
 * Note: Instagram typically requires linking to a Facebook Page.
 */

import { AutomationBrowser, createBrowser } from './browser';
import type { Page } from 'playwright';

export interface InstagramProfileData {
  username?: string; // desired username (if creating new)
  fullName: string;
  bio: string;
  website: string;
  email: string;
  phone?: string;
  category: string; // business category
  profileImagePath?: string;
}

export interface InstagramCredentials {
  username: string;
  password: string;
}

export interface InstagramProfileResult {
  success: boolean;
  profileUrl?: string;
  error?: string;
  screenshotPath?: string;
  needsManualAction?: boolean;
  manualActionDescription?: string;
}

export class InstagramProfileCreator {
  private browser: AutomationBrowser;
  private page: Page | null = null;

  constructor() {
    // Mobile emulation - Instagram mobile web is more automation-friendly
    this.browser = createBrowser({
      headless: false,
      slowMo: 120,
      viewport: { width: 390, height: 844 }, // iPhone-like
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    });
  }

  /**
   * Full flow: Login -> Edit Profile -> Convert to Business
   */
  async setupBusinessProfile(
    credentials: InstagramCredentials,
    profileData: InstagramProfileData
  ): Promise<InstagramProfileResult> {
    try {
      this.page = await this.browser.launch();

      // Step 1: Login
      const loginResult = await this.login(credentials);
      if (!loginResult.success) return loginResult;

      // Step 2: Edit profile information
      await this.browser.randomDelay(2000, 4000);
      const editResult = await this.editProfile(profileData);
      if (!editResult.success) return editResult;

      // Step 3: Switch to Business Account
      await this.browser.randomDelay(2000, 4000);
      const businessResult = await this.switchToBusinessAccount(profileData);

      return businessResult;
    } catch (error: any) {
      const screenshotPath = await this.browser.screenshot('instagram-error');
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
   * Login to Instagram
   */
  private async login(credentials: InstagramCredentials): Promise<InstagramProfileResult> {
    await this.browser.goto('https://www.instagram.com/accounts/login/');
    await this.browser.randomDelay(2000, 4000);

    // Dismiss cookie banner if present
    const cookieBtn = await this.browser.elementExists('button:has-text("Allow")');
    if (cookieBtn) {
      await this.browser.humanClick('button:has-text("Allow")');
      await this.browser.randomDelay(1000, 2000);
    }

    // Check if already logged in
    const isLoggedIn = await this.browser.elementExists('[aria-label="Home"]') ||
                       await this.browser.elementExists('a[href="/accounts/activity/"]');
    if (isLoggedIn) {
      return { success: true };
    }

    // Fill login form
    await this.browser.humanType('input[name="username"]', credentials.username);
    await this.browser.randomDelay(500, 1000);
    await this.browser.humanType('input[name="password"]', credentials.password);
    await this.browser.randomDelay(500, 1500);

    // Submit
    await this.browser.humanClick('button[type="submit"]');
    await this.browser.waitForNavigation();
    await this.browser.randomDelay(3000, 5000);

    // Check for challenge/verification
    const hasChallenge = await this.browser.elementExists('[name="verificationCode"]') ||
                         await this.browser.elementExists('input[name="security_code"]');
    if (hasChallenge) {
      const screenshotPath = await this.browser.screenshot('instagram-verification');
      return {
        success: false,
        needsManualAction: true,
        manualActionDescription: 'Instagram requires security verification. Please complete manually.',
        screenshotPath,
      };
    }

    // Check for suspicious login
    const suspicious = await this.browser.elementExists('button:has-text("This Was Me")');
    if (suspicious) {
      await this.browser.humanClick('button:has-text("This Was Me")');
      await this.browser.randomDelay(2000, 3000);
    }

    // Dismiss "Save Login Info" prompt
    const saveLoginPrompt = await this.browser.elementExists('button:has-text("Not Now")');
    if (saveLoginPrompt) {
      await this.browser.humanClick('button:has-text("Not Now")');
      await this.browser.randomDelay(1000, 2000);
    }

    // Dismiss notifications prompt
    const notifPrompt = await this.browser.elementExists('button:has-text("Not Now")');
    if (notifPrompt) {
      await this.browser.humanClick('button:has-text("Not Now")');
      await this.browser.randomDelay(1000, 2000);
    }

    return { success: true };
  }

  /**
   * Edit profile with product information
   */
  private async editProfile(profileData: InstagramProfileData): Promise<InstagramProfileResult> {
    // Navigate to edit profile
    await this.browser.goto('https://www.instagram.com/accounts/edit/');
    await this.browser.randomDelay(2000, 3000);

    // Full name
    const nameInput = await this.browser.elementExists('input[name="fullName"], input[id="pepName"]');
    if (nameInput) {
      await this.browser.humanType('input[name="fullName"], input[id="pepName"]', profileData.fullName, { clearFirst: true });
      await this.browser.randomDelay(500, 1000);
    }

    // Website
    const websiteInput = await this.browser.elementExists('input[name="website"], input[id="pepWebsite"]');
    if (websiteInput) {
      await this.browser.humanType('input[name="website"], input[id="pepWebsite"]', profileData.website, { clearFirst: true });
      await this.browser.randomDelay(500, 1000);
    }

    // Bio
    const bioInput = await this.browser.elementExists('textarea[name="biography"], textarea[id="pepBio"]');
    if (bioInput) {
      await this.browser.humanType('textarea[name="biography"], textarea[id="pepBio"]', profileData.bio.substring(0, 150), { clearFirst: true });
      await this.browser.randomDelay(500, 1000);
    }

    // Email
    const emailInput = await this.browser.elementExists('input[name="email"]');
    if (emailInput) {
      await this.browser.humanType('input[name="email"]', profileData.email, { clearFirst: true });
      await this.browser.randomDelay(500, 1000);
    }

    // Phone
    if (profileData.phone) {
      const phoneInput = await this.browser.elementExists('input[name="phoneNumber"]');
      if (phoneInput) {
        await this.browser.humanType('input[name="phoneNumber"]', profileData.phone, { clearFirst: true });
        await this.browser.randomDelay(500, 1000);
      }
    }

    // Submit profile changes
    const submitBtn = await this.browser.elementExists('button:has-text("Submit"), button[type="submit"]');
    if (submitBtn) {
      await this.browser.humanClick('button:has-text("Submit"), button[type="submit"]');
      await this.browser.randomDelay(2000, 3000);
    }

    // Upload profile picture
    if (profileData.profileImagePath) {
      const changePhoto = await this.browser.elementExists('button:has-text("Change Profile Photo"), [aria-label="Change profile photo"]');
      if (changePhoto) {
        await this.browser.humanClick('button:has-text("Change Profile Photo"), [aria-label="Change profile photo"]');
        await this.browser.randomDelay(1000, 2000);
        const uploadBtn = await this.browser.elementExists('button:has-text("Upload Photo")');
        if (uploadBtn) {
          await this.browser.humanClick('button:has-text("Upload Photo")');
          await this.browser.randomDelay(500, 1000);
          await this.browser.uploadFile('input[type="file"]', profileData.profileImagePath);
          await this.browser.randomDelay(3000, 5000);
        }
      }
    }

    return { success: true };
  }

  /**
   * Switch account to Business type
   */
  private async switchToBusinessAccount(profileData: InstagramProfileData): Promise<InstagramProfileResult> {
    // Navigate to account settings
    await this.browser.goto('https://www.instagram.com/accounts/convert_to_professional_account/');
    await this.browser.randomDelay(2000, 3000);

    // If not available via direct URL, try through settings
    const hasConvertOption = await this.browser.elementExists('button:has-text("Continue")') ||
                             await this.browser.elementExists('button:has-text("Switch to Professional")');

    if (!hasConvertOption) {
      // Try alternative path
      await this.browser.goto('https://www.instagram.com/accounts/edit/');
      await this.browser.randomDelay(2000, 3000);

      const professionalLink = await this.browser.elementExists('a:has-text("Switch to professional account")');
      if (professionalLink) {
        await this.browser.humanClick('a:has-text("Switch to professional account")');
        await this.browser.randomDelay(2000, 3000);
      } else {
        return {
          success: true,
          profileUrl: `https://www.instagram.com/${profileData.username || ''}`,
          needsManualAction: true,
          manualActionDescription: 'Could not find business account conversion option. Profile updated but may need manual switch to Business.',
        };
      }
    }

    // Walk through the business setup wizard
    // Step 1: Select category
    const categoryInput = await this.browser.elementExists('input[placeholder*="Search"]');
    if (categoryInput) {
      await this.browser.humanType('input[placeholder*="Search"]', profileData.category);
      await this.browser.randomDelay(1500, 2500);
      const suggestion = await this.browser.elementExists('[role="option"]:first-child, button:has-text("' + profileData.category + '")');
      if (suggestion) {
        await this.browser.humanClick('[role="option"]:first-child');
        await this.browser.randomDelay(1000, 2000);
      }
    }

    // Click through "Next" / "Continue" buttons
    for (let i = 0; i < 5; i++) {
      const nextBtn = await this.browser.elementExists('button:has-text("Next"), button:has-text("Continue"), button:has-text("Done")');
      if (nextBtn) {
        await this.browser.humanClick('button:has-text("Next"), button:has-text("Continue"), button:has-text("Done")');
        await this.browser.randomDelay(1500, 3000);
      } else {
        break;
      }
    }

    // Select "Business" (not "Creator")
    const businessOption = await this.browser.elementExists('button:has-text("Business")');
    if (businessOption) {
      await this.browser.humanClick('button:has-text("Business")');
      await this.browser.randomDelay(1000, 2000);
    }

    // Final confirm
    const doneBtn = await this.browser.elementExists('button:has-text("Done"), button:has-text("Confirm")');
    if (doneBtn) {
      await this.browser.humanClick('button:has-text("Done"), button:has-text("Confirm")');
      await this.browser.randomDelay(2000, 3000);
    }

    return {
      success: true,
      profileUrl: `https://www.instagram.com/${profileData.username || ''}`,
    };
  }
}

/**
 * Quick helper to set up an Instagram Business Profile
 */
export async function setupInstagramBusiness(
  credentials: InstagramCredentials,
  profileData: InstagramProfileData
): Promise<InstagramProfileResult> {
  const creator = new InstagramProfileCreator();
  return creator.setupBusinessProfile(credentials, profileData);
}
