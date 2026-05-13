/**
 * Launch Pilot - Email Follow-Up Engine
 * 
 * Inspired by Mautic's drip campaign system.
 * Auto-generates and schedules polite follow-up emails to directory
 * editors who haven't approved submissions after X days.
 * 
 * Strategy: 
 * - Day 3: Friendly check-in
 * - Day 7: Value-add follow-up (mention traction/users)
 * - Day 14: Final gentle nudge
 * 
 * Key principle: Be helpful, not pushy. Editors are humans.
 */

export interface FollowUpConfig {
  productName: string;
  productUrl: string;
  productDescription: string;
  submitterName: string;
  submitterEmail: string;
}

export interface FollowUpEmail {
  id: string;
  sequence: number; // 1, 2, or 3
  dayOffset: number; // days after submission to send
  subject: string;
  body: string;
  platform: string;
  platformEmail?: string;
  status: 'scheduled' | 'sent' | 'skipped'; // skip if approved before send
}

export interface FollowUpSchedule {
  submissionId: string;
  platform: string;
  emails: FollowUpEmail[];
}

// Known directory editor/support emails
const DIRECTORY_CONTACTS: Record<string, { email?: string; contactUrl?: string; notes: string }> = {
  betalist: { contactUrl: 'https://betalist.com/contact', notes: 'Reply to confirmation email. Usually approves in 2-5 days.' },
  product_hunt: { notes: 'No follow-up needed. Approval is automatic. Focus on community engagement.' },
  alternativeto: { contactUrl: 'https://alternativeto.net/contact/', notes: 'Follow up via contact form if not approved in 7 days.' },
  saashub: { contactUrl: 'https://www.saashub.com/contact', notes: 'Usually fast approval. Follow up if > 5 days.' },
  launching_next: { email: 'hello@launchingnext.com', notes: 'Small team, follow up after 5 days.' },
  startup_base: { notes: 'Usually auto-approves. If not, no contact method available.' },
  crunchbase: { notes: 'Approval can take 2+ weeks. Follow up via their edit suggestion system.' },
  g2: { notes: 'Has a vendor portal. Check your G2 vendor dashboard for status.' },
  capterra: { notes: 'Contact through vendor portal. Approval takes 1-2 weeks.' },
  indie_hackers: { notes: 'Self-publish. No approval needed for product pages.' },
  microlaunch: { contactUrl: 'https://microlaunch.net/contact', notes: 'Small indie project. Be patient, usually 3-7 days.' },
  devhunt: { notes: 'GitHub-based. Usually fast approval.' },
  uneed: { notes: 'Curated. If not listed in 7 days, reach out via Twitter @unaboratorio.' },
};

/**
 * Generate a full follow-up email schedule for a submission
 */
export function generateFollowUpSchedule(
  submissionId: string,
  platform: string,
  config: FollowUpConfig
): FollowUpSchedule {
  const contact = DIRECTORY_CONTACTS[platform];
  
  const emails: FollowUpEmail[] = [
    // Email 1: Day 3 - Friendly check-in
    {
      id: `${submissionId}_fu1`,
      sequence: 1,
      dayOffset: 3,
      subject: generateSubject(1, config.productName, platform),
      body: generateBody(1, config, platform),
      platform,
      platformEmail: contact?.email,
      status: 'scheduled',
    },
    // Email 2: Day 7 - Value-add (mention traction)
    {
      id: `${submissionId}_fu2`,
      sequence: 2,
      dayOffset: 7,
      subject: generateSubject(2, config.productName, platform),
      body: generateBody(2, config, platform),
      platform,
      platformEmail: contact?.email,
      status: 'scheduled',
    },
    // Email 3: Day 14 - Final gentle nudge
    {
      id: `${submissionId}_fu3`,
      sequence: 3,
      dayOffset: 14,
      subject: generateSubject(3, config.productName, platform),
      body: generateBody(3, config, platform),
      platform,
      platformEmail: contact?.email,
      status: 'scheduled',
    },
  ];

  return { submissionId, platform, emails };
}

/**
 * Generate subject line for follow-up sequence
 */
function generateSubject(sequence: number, productName: string, platform: string): string {
  const platformName = platform.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  const subjects: Record<number, string[]> = {
    1: [
      `Quick check-in: ${productName} submission on ${platformName}`,
      `Following up on ${productName} listing`,
      `${productName} submission status?`,
    ],
    2: [
      `Update on ${productName} - growing fast!`,
      `${productName} update + listing check-in`,
      `Would love to be listed - ${productName} update`,
    ],
    3: [
      `Last follow-up: ${productName} on ${platformName}`,
      `Gentle nudge - ${productName} listing`,
      `Any update on ${productName}? Happy to help`,
    ],
  };

  const options = subjects[sequence] || subjects[1];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Generate email body for follow-up sequence
 */
function generateBody(sequence: number, config: FollowUpConfig, platform: string): string {
  const platformName = platform.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  if (sequence === 1) {
    return `Hi there!

I submitted ${config.productName} to ${platformName} a few days ago and wanted to check in.

Quick recap:
- ${config.productName}: ${config.productDescription.split('.')[0]}
- URL: ${config.productUrl}

Is there anything else you need from me to complete the listing? Happy to provide additional details, screenshots, or adjust the description.

Thanks for your time!

Best,
${config.submitterName}
${config.submitterEmail}`;
  }

  if (sequence === 2) {
    return `Hi!

Following up on my ${platformName} submission for ${config.productName}.

Quick update since I submitted:
- We've been getting great early feedback from users
- Just shipped some new features based on user requests
- Would love for ${platformName} users to discover us too

Here's the link again: ${config.productUrl}

Let me know if there's anything I can do to help with the listing process. Happy to provide a demo, additional assets, or answer any questions.

Thanks!

${config.submitterName}`;
  }

  // Sequence 3
  return `Hi!

This is my last follow-up regarding ${config.productName} on ${platformName}.

I completely understand you're busy and get lots of submissions. If ${config.productName} isn't the right fit, no worries at all.

But if there's something I can improve about the submission or if you need anything else from me, I'm happy to help:
- ${config.productUrl}
- ${config.productDescription.split('.')[0]}

Either way, thanks for what you do with ${platformName}. It's a great resource!

Best,
${config.submitterName}`;
}

/**
 * Check which follow-ups should be sent today
 */
export function getFollowUpsDueToday(
  schedules: FollowUpSchedule[],
  submissionDates: Record<string, Date>,
  approvedSubmissions: Set<string>
): FollowUpEmail[] {
  const today = new Date();
  const dueEmails: FollowUpEmail[] = [];

  for (const schedule of schedules) {
    // Skip if submission was approved
    if (approvedSubmissions.has(schedule.submissionId)) continue;

    const submissionDate = submissionDates[schedule.submissionId];
    if (!submissionDate) continue;

    const daysSinceSubmission = Math.floor(
      (today.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    for (const email of schedule.emails) {
      if (email.status === 'scheduled' && daysSinceSubmission >= email.dayOffset) {
        // Check if previous emails in sequence were sent
        const prevEmails = schedule.emails.filter(e => e.sequence < email.sequence);
        const allPrevSent = prevEmails.every(e => e.status === 'sent');
        
        if (allPrevSent || email.sequence === 1) {
          dueEmails.push(email);
        }
      }
    }
  }

  return dueEmails;
}

/**
 * Get directory contact info for manual follow-ups
 */
export function getDirectoryContact(platformId: string): { email?: string; contactUrl?: string; notes: string } | null {
  return DIRECTORY_CONTACTS[platformId] || null;
}

/**
 * Generate a "thank you for approving" response template
 */
export function generateThankYouEmail(config: FollowUpConfig, platform: string): string {
  const platformName = platform.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  return `Hi!

Just wanted to say thanks for listing ${config.productName} on ${platformName}! Really appreciate it.

If you ever need anything from us - updated screenshots, description changes, or anything else - just let me know.

Keep up the great work with ${platformName}!

Best,
${config.submitterName}`;
}
