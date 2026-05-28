import * as crypto from 'crypto';

export function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';

  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(crypto.randomInt(0, digits.length))];
  }

  return otp;
}
