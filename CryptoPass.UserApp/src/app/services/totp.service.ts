import { Injectable } from '@angular/core';
import * as OTPAuth from 'otpauth';

@Injectable({
  providedIn: 'root',
})
export class TotpService {
  /**
   * Generate a TOTP code from a secret
   */
  generateCode(secret: string): string {
    try {
      const totp = new OTPAuth.TOTP({
        secret: OTPAuth.Secret.fromBase32(secret),
        digits: 6,
        period: 30,
      });
      return totp.generate();
    } catch (error) {
      console.error('Error generating TOTP:', error);
      return '------';
    }
  }

  /**
   * Get remaining seconds until next code
   */
  getRemainingSeconds(): number {
    return 30 - (Math.floor(Date.now() / 1000) % 30);
  }

  /**
   * Generate a new random secret (Base32)
   */
  generateSecret(): string {
    const secret = new OTPAuth.Secret({ size: 20 });
    return secret.base32;
  }

  /**
   * Create OTP Auth URL for QR code
   */
  getOtpAuthUrl(secret: string, issuer: string, accountName: string): string {
    const totp = new OTPAuth.TOTP({
      issuer: issuer,
      label: accountName,
      secret: OTPAuth.Secret.fromBase32(secret),
      digits: 6,
      period: 30,
    });
    return totp.toString();
  }

  /**
   * Parse OTP Auth URL from QR code
   */
  parseOtpAuthUrl(url: string): { secret: string; issuer?: string; label?: string } | null {
    try {
      const totp = OTPAuth.URI.parse(url);
      return {
        secret: totp.secret.base32,
        issuer: totp.issuer,
        label: totp.label,
      };
    } catch (error) {
      console.error('Error parsing OTP Auth URL:', error);
      return null;
    }
  }
}
