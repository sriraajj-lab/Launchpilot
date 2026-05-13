/**
 * Launch Pilot - Webhook Notification System
 * 
 * Inspired by Mautic's multi-channel notification approach.
 * Sends real-time notifications when submissions succeed, fail,
 * or need manual attention.
 * 
 * Supports: Slack, Discord, Email, and generic webhooks.
 */

export interface NotificationConfig {
  slack?: { webhookUrl: string; channel?: string };
  discord?: { webhookUrl: string };
  email?: { to: string; from?: string };
  webhook?: { url: string; headers?: Record<string, string> };
}

export type NotificationEvent = 
  | 'submission_success'
  | 'submission_failed'
  | 'submission_captcha'
  | 'campaign_started'
  | 'campaign_completed'
  | 'social_page_created'
  | 'follow_up_due'
  | 'directory_approved';

export interface NotificationPayload {
  event: NotificationEvent;
  productName: string;
  platform?: string;
  url?: string;
  error?: string;
  details?: string;
  timestamp: Date;
}

/**
 * Send notification to all configured channels
 */
export async function sendNotification(
  config: NotificationConfig,
  payload: NotificationPayload
): Promise<void> {
  const promises: Promise<void>[] = [];

  if (config.slack) {
    promises.push(sendSlackNotification(config.slack, payload));
  }
  if (config.discord) {
    promises.push(sendDiscordNotification(config.discord, payload));
  }
  if (config.webhook) {
    promises.push(sendWebhookNotification(config.webhook, payload));
  }

  // Fire all notifications in parallel, don't let one failure block others
  await Promise.allSettled(promises);
}

/**
 * Send Slack notification via Incoming Webhook
 */
async function sendSlackNotification(
  config: { webhookUrl: string; channel?: string },
  payload: NotificationPayload
): Promise<void> {
  const { emoji, color } = getEventStyle(payload.event);
  
  const message = {
    channel: config.channel,
    username: 'LaunchPilot',
    icon_emoji: ':rocket:',
    attachments: [{
      color,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${emoji} *${getEventTitle(payload.event)}*\n\n${formatNotificationBody(payload)}`,
          },
        },
        ...(payload.url ? [{
          type: 'actions',
          elements: [{
            type: 'button',
            text: { type: 'plain_text', text: 'View' },
            url: payload.url,
          }],
        }] : []),
      ],
    }],
  };

  await fetch(config.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
}

/**
 * Send Discord notification via Webhook
 */
async function sendDiscordNotification(
  config: { webhookUrl: string },
  payload: NotificationPayload
): Promise<void> {
  const { emoji, color } = getEventStyle(payload.event);
  const colorInt = parseInt(color.replace('#', ''), 16);

  const message = {
    username: 'LaunchPilot',
    avatar_url: 'https://cdn-icons-png.flaticon.com/512/2534/2534204.png',
    embeds: [{
      title: `${emoji} ${getEventTitle(payload.event)}`,
      description: formatNotificationBody(payload),
      color: colorInt,
      fields: [
        ...(payload.platform ? [{ name: 'Platform', value: payload.platform, inline: true }] : []),
        ...(payload.productName ? [{ name: 'Product', value: payload.productName, inline: true }] : []),
        ...(payload.url ? [{ name: 'URL', value: payload.url, inline: false }] : []),
      ],
      timestamp: payload.timestamp.toISOString(),
      footer: { text: 'LaunchPilot' },
    }],
  };

  await fetch(config.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
}

/**
 * Send generic webhook notification
 */
async function sendWebhookNotification(
  config: { url: string; headers?: Record<string, string> },
  payload: NotificationPayload
): Promise<void> {
  await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
    },
    body: JSON.stringify({
      event: payload.event,
      product: payload.productName,
      platform: payload.platform,
      url: payload.url,
      error: payload.error,
      details: payload.details,
      timestamp: payload.timestamp.toISOString(),
    }),
  });
}

/**
 * Format the notification body text
 */
function formatNotificationBody(payload: NotificationPayload): string {
  switch (payload.event) {
    case 'submission_success':
      return `**${payload.productName}** was successfully submitted to **${payload.platform}**!${payload.url ? `\nLive at: ${payload.url}` : ''}`;
    
    case 'submission_failed':
      return `Submission to **${payload.platform}** failed for **${payload.productName}**.${payload.error ? `\nError: ${payload.error}` : ''}`;
    
    case 'submission_captcha':
      return `**${payload.platform}** requires CAPTCHA for **${payload.productName}**. Manual action needed.`;
    
    case 'campaign_started':
      return `Campaign for **${payload.productName}** has started! Submitting to multiple platforms.`;
    
    case 'campaign_completed':
      return `Campaign for **${payload.productName}** is complete!\n${payload.details || ''}`;
    
    case 'social_page_created':
      return `${payload.platform} page created for **${payload.productName}**!${payload.url ? `\n${payload.url}` : ''}`;
    
    case 'follow_up_due':
      return `Time to follow up with **${payload.platform}** about **${payload.productName}**. It's been a few days since submission.`;
    
    case 'directory_approved':
      return `**${payload.productName}** was approved on **${payload.platform}**! 🎉${payload.url ? `\nLive at: ${payload.url}` : ''}`;
    
    default:
      return payload.details || 'LaunchPilot notification';
  }
}

/**
 * Get event styling (emoji + color)
 */
function getEventStyle(event: NotificationEvent): { emoji: string; color: string } {
  const styles: Record<NotificationEvent, { emoji: string; color: string }> = {
    submission_success: { emoji: '✅', color: '#22c55e' },
    submission_failed: { emoji: '❌', color: '#ef4444' },
    submission_captcha: { emoji: '⚠️', color: '#f59e0b' },
    campaign_started: { emoji: '🚀', color: '#3b82f6' },
    campaign_completed: { emoji: '🎉', color: '#8b5cf6' },
    social_page_created: { emoji: '📱', color: '#06b6d4' },
    follow_up_due: { emoji: '📧', color: '#f97316' },
    directory_approved: { emoji: '🏆', color: '#10b981' },
  };
  return styles[event] || { emoji: '📣', color: '#6b7280' };
}

/**
 * Get human-readable event title
 */
function getEventTitle(event: NotificationEvent): string {
  const titles: Record<NotificationEvent, string> = {
    submission_success: 'Submission Successful',
    submission_failed: 'Submission Failed',
    submission_captcha: 'CAPTCHA Required',
    campaign_started: 'Campaign Launched',
    campaign_completed: 'Campaign Complete',
    social_page_created: 'Social Page Created',
    follow_up_due: 'Follow-Up Reminder',
    directory_approved: 'Directory Approved!',
  };
  return titles[event] || 'Notification';
}

/**
 * Generate a campaign completion summary for notifications
 */
export function generateCampaignSummary(
  productName: string,
  results: { platform: string; status: string }[]
): string {
  const success = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const captcha = results.filter(r => r.status === 'captcha_needed').length;
  const manual = results.filter(r => r.status === 'manual_needed').length;
  const total = results.length;

  return `📊 Results for ${productName}:
• ✅ Successful: ${success}/${total}
• ❌ Failed: ${failed}
• ⚠️ CAPTCHA needed: ${captcha}
• 👆 Manual needed: ${manual}

${success > total * 0.7 ? '🎯 Great launch! Most submissions went through.' : success > total * 0.4 ? '📈 Decent results. Check failed ones for retry.' : '⚠️ Some issues. Review failed submissions.'}`;
}
