import * as crypto from 'crypto';
import * as bycrypt from 'bcryptjs';

export function createHash(
  plainData: string,
  saltRounds: number,
): Promise<string> {
  return bycrypt.hash(plainData, saltRounds);
}

export function verifyHash(
  plainData: string,
  hashedData: string,
): Promise<boolean> {
  return bycrypt.compare(plainData, hashedData);
}

export function createRandomToken(size: number): string {
  return crypto.randomBytes(size).toString('hex');
}
