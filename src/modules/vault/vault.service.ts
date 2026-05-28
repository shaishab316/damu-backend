import { Env } from '@/common/config/app.config';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PasswordHashMethod, Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import bcrypt from 'bcryptjs';

export type HashAlgo = 'sha256' | 'sha512' | 'md5';
export type EncryptAlgo = 'aes-256-cbc' | 'aes-128-cbc' | 'aes-256-gcm';

@Injectable()
export class VaultService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  IV_LENGTH = 16;

  createVault(value: string, type: string = 'generic') {
    return {
      keyId: this.config.get('VAULT_ENCRYPTION_KEY_ID'),
      algorithm: this.config.get('CURRENT_ALGORITHM'),
      hash: this.hashPlain(value),
      encrypted: this.encrypt(
        value,
        this.config.get('VAULT_ENCRYPTION_KEY'),
        this.config.get('CURRENT_ALGORITHM'),
      ),
      type,
    } satisfies Prisma.VaultCreateArgs['data'];
  }

  hash(value: string, key: string, algo: HashAlgo = 'sha256'): string {
    return crypto.createHmac(algo, key).update(value).digest('hex');
  }

  hashPlain(value: string, algo: HashAlgo = 'sha256'): string {
    return crypto
      .createHash(algo)
      .update(value.toLowerCase().trim())
      .digest('hex');
  }

  encrypt(
    value: string,
    key: string,
    algo: EncryptAlgo = this.config.get('CURRENT_ALGORITHM'),
  ): string {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const keyBuffer = Buffer.from(key, 'hex');

    if (algo === 'aes-256-gcm') {
      const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
      const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
      const tag = (cipher as crypto.CipherGCM).getAuthTag();
      return `${algo}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
    }

    const cipher = crypto.createCipheriv(algo, keyBuffer, iv);
    const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
    return `${algo}:${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(
    value: string,
    key: string = this.config.get('VAULT_ENCRYPTION_KEY'),
  ): string {
    const parts = value.split(':');
    const algo = parts[0] as EncryptAlgo;
    const keyBuffer = Buffer.from(key, 'hex');

    if (algo === 'aes-256-gcm') {
      const iv = Buffer.from(parts[1], 'hex');
      const tag = Buffer.from(parts[2], 'hex');
      const encrypted = Buffer.from(parts[3], 'hex');
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        keyBuffer,
        iv,
      ) as crypto.DecipherGCM;
      decipher.setAuthTag(tag);
      return Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]).toString();
    }

    const iv = Buffer.from(parts[1], 'hex');
    const encrypted = Buffer.from(parts[2], 'hex');
    const decipher = crypto.createDecipheriv(algo, keyBuffer, iv);
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString();
  }

  isEncrypted(value: string): boolean {
    return /^aes-(256|128)-(cbc|gcm):/.test(value);
  }

  generateKey(bytes: 16 | 24 | 32 = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  randomToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  compare(
    plain: string,
    hashed: string,
    key: string,
    algo: HashAlgo = 'sha256',
  ): boolean {
    const hash = this.hash(plain, key, algo);
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hashed));
  }

  comparePlain(
    plain: string,
    hashed: string,
    algo: HashAlgo = 'sha256',
  ): boolean {
    const hash = this.hashPlain(plain, algo);
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hashed));
  }

  SALT_ROUNDS = 10;

  async hashPassword(password: string) {
    return {
      passwordHash: await bcrypt.hash(password, this.SALT_ROUNDS),
      passwordHashMethod: PasswordHashMethod.BCRYPT,
    };
  }

  async comparePassword(
    plain: string,
    hashed: string,
    method = PasswordHashMethod.BCRYPT as PasswordHashMethod,
  ) {
    if (method !== PasswordHashMethod.BCRYPT) {
      throw new Error(`Unsupported password hash method: ${method}`);
    }

    return await bcrypt.compare(plain, hashed);
  }
}
