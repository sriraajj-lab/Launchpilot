/**
 * Launch Pilot - Encryption Utilities
 * 
 * AES-256-GCM encryption for storing platform credentials securely.
 * All credentials are encrypted at rest in the database.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be set and at least 32 characters. Generate with: openssl rand -hex 32');
  }
  // Use first 32 bytes (64 hex chars = 32 bytes)
  return Buffer.from(key.slice(0, 64), 'hex');
}

/**
 * Encrypt a string value
 */
export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  // Format: iv:tag:ciphertext (all hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an encrypted string
 */
export function decrypt(encryptedText: string): string {
  const key = getKey();
  const parts = encryptedText.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Encrypt a JSON object
 */
export function encryptJSON(data: Record<string, any>): string {
  return encrypt(JSON.stringify(data));
}

/**
 * Decrypt to a JSON object
 */
export function decryptJSON<T = Record<string, any>>(encryptedText: string): T {
  return JSON.parse(decrypt(encryptedText)) as T;
}
