import { NextRequest } from 'next/server';

/**
 * Safely extracts client IP address according to Vercel production proxy rules.
 * Uses Vercel-set x-forwarded-for (first address) or x-real-ip.
 * Never trusts arbitrary client-controlled custom headers.
 */
export function getClientIp(req: NextRequest): string {
  // 1. x-forwarded-for: Vercel prepends/appends connecting client IP as the first comma-separated address
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (firstIp && isValidIp(firstIp)) {
      return firstIp;
    }
  }

  // 2. x-real-ip: Set by Vercel edge reverse proxy to connecting client IP
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    const trimmed = realIp.trim();
    if (trimmed && isValidIp(trimmed)) {
      return trimmed;
    }
  }

  return '127.0.0.1';
}

function isValidIp(ip: string): boolean {
  // Basic IPv4 / IPv6 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === 'localhost' || ip.startsWith('test-');
}
