import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALG = 'aes-256-cbc';
const IV_LEN = 16;

function getKey(): Buffer {
  const secret = process.env.CREDENTIAL_SECRET || 'webbeacrm-default-secret-key-32b!';
  return scryptSync(secret, 'webbeacrm-salt', 32);
}

export function encrypt(text: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(data: string): string {
  const [ivHex, encHex] = data.split(':');
  if (!ivHex || !encHex) return '';
  const iv = Buffer.from(ivHex, 'hex');
  const enc = Buffer.from(encHex, 'hex');
  const decipher = createDecipheriv(ALG, getKey(), iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
