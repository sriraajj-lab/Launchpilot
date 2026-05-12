/**
 * Launch Pilot - Browser Automation Engine
 * 
 * Core Playwright wrapper with human-like behavior simulation,
 * CAPTCHA detection, anti-bot evasion, and session management.
 */

import { chromium, Browser, BrowserContext, Page, ElementHandle } from 'playwright';

export interface BrowserConfig {
  headless?: boolean;
  slowMo?: number;
  timeout?: number;
  proxy?: { server: string; username?: string; password?: string };
  userAgent?: string;
  viewport?: { width: number; height: number };
}

export interface LoginCredentials {
  username: string;
  password: string;
  platform: string;
}

const DEFAULT_CONFIG: BrowserConfig = {
  headless: process.env.HEADLESS !== 'false',
  slowMo: parseInt(process.env.SLOW_MO || '50'),
  timeout: parseInt(process.env.DEFAULT_TIMEOUT || '30000'),
  viewport: { width: 1366, height: 768 },
};

// Common user agents to rotate through
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
];

export class AutomationBrowser {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: BrowserConfig;

  constructor(config: Partial<BrowserConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Launch browser with stealth settings
   */
  async launch(): Promise<Page> {
    this.browser = await chromium.launch({
      headless: this.config.headless,
      slowMo: this.config.slowMo,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });

    const userAgent = this.config.userAgent || USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

    this.context = await this.browser.newContext({
      userAgent,
      viewport: this.config.viewport,
      locale: 'en-US',
      timezoneId: 'America/New_York',
      geolocation: { latitude: 40.7128, longitude: -74.0060 },
      permissions: ['geolocation'],
      ...(this.config.proxy && { proxy: this.config.proxy }),
    });

    // Anti-detection: Override navigator properties
    await this.context.addInitScript(() => {
      // Hide webdriver property
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      
      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Override chrome detection
      (window as any).chrome = { runtime: {} };

      // Mock permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
          : originalQuery(parameters);
    });

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(this.config.timeout || 30000);

    return this.page;
  }

  /**
   * Get the current page instance
   */
  getPage(): Page | null {
    return this.page;
  }

  /**
   * Navigate to a URL with retry logic
   */
  async goto(url: string, retries = 3): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        await this.page!.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await this.randomDelay(1000, 3000);
        return;
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.randomDelay(2000, 5000);
      }
    }
  }

  /**
   * Type text with human-like delays between keystrokes
   */
  async humanType(selector: string, text: string, options?: { clearFirst?: boolean }): Promise<void> {
    const element = await this.page!.waitForSelector(selector, { state: 'visible' });
    if (!element) throw new Error(`Element not found: ${selector}`);

    if (options?.clearFirst) {
      await element.click({ clickCount: 3 });
      await this.page!.keyboard.press('Backspace');
      await this.randomDelay(200, 500);
    }

    await element.click();
    await this.randomDelay(300, 800);

    for (const char of text) {
      await this.page!.keyboard.type(char, { delay: this.getRandomTypingDelay() });
      // Occasionally pause mid-typing (simulates thinking)
      if (Math.random() < 0.05) {
        await this.randomDelay(500, 1500);
      }
    }
  }

  /**
   * Click an element with human-like mouse movement
   */
  async humanClick(selector: string): Promise<void> {
    const element = await this.page!.waitForSelector(selector, { state: 'visible' });
    if (!element) throw new Error(`Element not found: ${selector}`);

    const box = await element.boundingBox();
    if (!box) throw new Error(`Cannot get bounding box for: ${selector}`);

    // Click at a random point within the element (not dead center)
    const x = box.x + box.width * (0.3 + Math.random() * 0.4);
    const y = box.y + box.height * (0.3 + Math.random() * 0.4);

    await this.page!.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 5 });
    await this.randomDelay(100, 300);
    await this.page!.mouse.click(x, y);
    await this.randomDelay(200, 600);
  }

  /**
   * Scroll the page like a human (not instant)
   */
  async humanScroll(direction: 'down' | 'up' = 'down', amount = 300): Promise<void> {
    const scrollAmount = direction === 'down' ? amount : -amount;
    const steps = Math.floor(Math.random() * 3) + 2;
    const stepAmount = scrollAmount / steps;

    for (let i = 0; i < steps; i++) {
      await this.page!.mouse.wheel(0, stepAmount);
      await this.randomDelay(100, 400);
    }
    await this.randomDelay(500, 1500);
  }

  /**
   * Detect if a CAPTCHA is present on the page
   */
  async detectCaptcha(): Promise<{ hasCaptcha: boolean; type: string | null }> {
    const captchaSelectors = [
      { selector: 'iframe[src*="recaptcha"]', type: 'reCAPTCHA' },
      { selector: 'iframe[src*="hcaptcha"]', type: 'hCaptcha' },
      { selector: '.g-recaptcha', type: 'reCAPTCHA' },
      { selector: '.h-captcha', type: 'hCaptcha' },
      { selector: '[data-sitekey]', type: 'generic-captcha' },
      { selector: 'iframe[src*="challenge"]', type: 'challenge' },
      { selector: '#captcha', type: 'custom-captcha' },
      { selector: '.captcha', type: 'custom-captcha' },
      { selector: 'img[alt*="captcha" i]', type: 'image-captcha' },
    ];

    for (const { selector, type } of captchaSelectors) {
      const element = await this.page!.$(selector);
      if (element) {
        return { hasCaptcha: true, type };
      }
    }

    return { hasCaptcha: false, type: null };
  }

  /**
   * Wait for navigation or network idle
   */
  async waitForNavigation(timeout = 30000): Promise<void> {
    try {
      await this.page!.waitForLoadState('networkidle', { timeout });
    } catch {
      // Fallback - just wait for DOM
      await this.page!.waitForLoadState('domcontentloaded', { timeout });
    }
  }

  /**
   * Take a screenshot for debugging/logging
   */
  async screenshot(name: string): Promise<string> {
    const path = `screenshots/${name}-${Date.now()}.png`;
    await this.page!.screenshot({ path, fullPage: true });
    return path;
  }

  /**
   * Save cookies for session reuse
   */
  async saveCookies(): Promise<string> {
    const cookies = await this.context!.cookies();
    return JSON.stringify(cookies);
  }

  /**
   * Load saved cookies (for session reuse)
   */
  async loadCookies(cookiesJson: string): Promise<void> {
    const cookies = JSON.parse(cookiesJson);
    await this.context!.addCookies(cookies);
  }

  /**
   * Upload a file to a file input element
   */
  async uploadFile(selector: string, filePath: string): Promise<void> {
    const input = await this.page!.waitForSelector(selector);
    if (input) {
      await (input as ElementHandle<HTMLInputElement>).setInputFiles(filePath);
    }
  }

  /**
   * Select an option from a dropdown
   */
  async selectOption(selector: string, value: string): Promise<void> {
    await this.page!.selectOption(selector, value);
    await this.randomDelay(300, 800);
  }

  /**
   * Check if an element exists on the page
   */
  async elementExists(selector: string): Promise<boolean> {
    const element = await this.page!.$(selector);
    return element !== null;
  }

  /**
   * Get text content of an element
   */
  async getText(selector: string): Promise<string> {
    const element = await this.page!.waitForSelector(selector, { timeout: 5000 });
    return element ? (await element.textContent()) || '' : '';
  }

  /**
   * Wait with random human-like delay
   */
  async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    this.page = null;
    this.context = null;
    this.browser = null;
  }

  /**
   * Get random typing delay (realistic WPM)
   */
  private getRandomTypingDelay(): number {
    // Average human types 40-60 WPM = 200-300ms between chars
    // With occasional faster/slower bursts
    const base = Math.random() * 150 + 50; // 50-200ms
    // Occasional long pause (thinking)
    if (Math.random() < 0.02) return base + Math.random() * 500;
    return base;
  }
}

/**
 * Create a pre-configured browser for a specific platform
 */
export function createBrowser(config?: Partial<BrowserConfig>): AutomationBrowser {
  return new AutomationBrowser(config);
}
