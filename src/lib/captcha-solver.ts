/**
 * Launch Pilot - CAPTCHA Auto-Solver
 * 
 * Integrates with 2Captcha service to automatically solve CAPTCHAs
 * encountered during directory submissions.
 * 
 * Supports:
 * - reCAPTCHA v2 (image selection)
 * - hCaptcha
 * - Image CAPTCHAs
 * 
 * Set TWO_CAPTCHA_API_KEY env var to enable.
 * Without it, CAPTCHAs are flagged as 'captcha_needed' for manual solving.
 * 
 * Pricing: ~$3 per 1000 CAPTCHAs solved
 */

const TWO_CAPTCHA_API = 'https://2captcha.com';

export interface CaptchaSolveResult {
  success: boolean;
  solution?: string;
  error?: string;
}

/**
 * Attempt to solve a CAPTCHA using 2Captcha service
 */
export async function solveCaptcha(
  screenshotBase64: string,
  options?: {
    siteKey?: string; // For reCAPTCHA/hCaptcha
    pageUrl?: string;
    captchaType?: 'recaptcha' | 'hcaptcha' | 'image';
  }
): Promise<CaptchaSolveResult> {
  const apiKey = process.env.TWO_CAPTCHA_API_KEY;
  
  if (!apiKey) {
    return { success: false, error: '2Captcha API key not configured' };
  }

  try {
    // If we have a siteKey, use the token-based solver (more reliable)
    if (options?.siteKey && options?.pageUrl) {
      if (options.captchaType === 'hcaptcha') {
        return await solveHCaptcha(apiKey, options.siteKey, options.pageUrl);
      }
      return await solveReCaptchaV2(apiKey, options.siteKey, options.pageUrl);
    }

    // Fallback: solve from screenshot image
    if (screenshotBase64) {
      return await solveImageCaptcha(apiKey, screenshotBase64);
    }

    return { success: false, error: 'No captcha data to solve' };
  } catch (error: any) {
    return { success: false, error: `2Captcha error: ${error.message}` };
  }
}

/**
 * Solve reCAPTCHA v2 using siteKey
 */
async function solveReCaptchaV2(apiKey: string, siteKey: string, pageUrl: string): Promise<CaptchaSolveResult> {
  // Submit the captcha
  const submitUrl = `${TWO_CAPTCHA_API}/in.php?key=${apiKey}&method=userrecaptcha&googlekey=${siteKey}&pageurl=${encodeURIComponent(pageUrl)}&json=1`;
  
  const submitRes = await fetch(submitUrl);
  const submitData = await submitRes.json();
  
  if (submitData.status !== 1) {
    return { success: false, error: `Submit failed: ${submitData.request}` };
  }

  const taskId = submitData.request;
  
  // Poll for result (takes 15-60 seconds typically)
  return await pollForResult(apiKey, taskId);
}

/**
 * Solve hCaptcha using siteKey
 */
async function solveHCaptcha(apiKey: string, siteKey: string, pageUrl: string): Promise<CaptchaSolveResult> {
  const submitUrl = `${TWO_CAPTCHA_API}/in.php?key=${apiKey}&method=hcaptcha&sitekey=${siteKey}&pageurl=${encodeURIComponent(pageUrl)}&json=1`;
  
  const submitRes = await fetch(submitUrl);
  const submitData = await submitRes.json();
  
  if (submitData.status !== 1) {
    return { success: false, error: `Submit failed: ${submitData.request}` };
  }

  const taskId = submitData.request;
  return await pollForResult(apiKey, taskId);
}

/**
 * Solve image-based CAPTCHA
 */
async function solveImageCaptcha(apiKey: string, imageBase64: string): Promise<CaptchaSolveResult> {
  const submitUrl = `${TWO_CAPTCHA_API}/in.php`;
  
  const formData = new URLSearchParams();
  formData.append('key', apiKey);
  formData.append('method', 'base64');
  formData.append('body', imageBase64);
  formData.append('json', '1');

  const submitRes = await fetch(submitUrl, {
    method: 'POST',
    body: formData,
  });
  const submitData = await submitRes.json();
  
  if (submitData.status !== 1) {
    return { success: false, error: `Submit failed: ${submitData.request}` };
  }

  const taskId = submitData.request;
  return await pollForResult(apiKey, taskId);
}

/**
 * Poll 2Captcha for the solution (max 120 seconds)
 */
async function pollForResult(apiKey: string, taskId: string): Promise<CaptchaSolveResult> {
  const maxAttempts = 24; // 24 * 5s = 120 seconds max
  
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between polls
    
    const resultUrl = `${TWO_CAPTCHA_API}/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`;
    const resultRes = await fetch(resultUrl);
    const resultData = await resultRes.json();
    
    if (resultData.status === 1) {
      return { success: true, solution: resultData.request };
    }
    
    if (resultData.request === 'CAPCHA_NOT_READY') {
      continue; // Still processing
    }
    
    // Error
    return { success: false, error: `2Captcha error: ${resultData.request}` };
  }
  
  return { success: false, error: '2Captcha timeout (120s)' };
}

/**
 * Extract siteKey from page HTML for reCAPTCHA/hCaptcha
 * Used by the server engine when it detects a CAPTCHA
 */
export function extractSiteKey(pageHtml: string): { siteKey: string; type: 'recaptcha' | 'hcaptcha' } | null {
  // reCAPTCHA
  const recaptchaMatch = pageHtml.match(/data-sitekey="([^"]+)"/);
  if (recaptchaMatch) {
    return { siteKey: recaptchaMatch[1], type: 'recaptcha' };
  }
  
  // hCaptcha
  const hcaptchaMatch = pageHtml.match(/data-sitekey="([^"]+)"/) || 
                         pageHtml.match(/sitekey:\s*['"]([^'"]+)['"]/);
  if (hcaptchaMatch) {
    return { siteKey: hcaptchaMatch[1], type: 'hcaptcha' };
  }
  
  return null;
}

/**
 * Check if 2Captcha is configured and has balance
 */
export async function checkCaptchaBalance(): Promise<{ available: boolean; balance?: number }> {
  const apiKey = process.env.TWO_CAPTCHA_API_KEY;
  if (!apiKey) return { available: false };

  try {
    const res = await fetch(`${TWO_CAPTCHA_API}/res.php?key=${apiKey}&action=getbalance&json=1`);
    const data = await res.json();
    
    if (data.status === 1) {
      return { available: true, balance: parseFloat(data.request) };
    }
    return { available: false };
  } catch {
    return { available: false };
  }
}
