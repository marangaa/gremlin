const SENSITIVE_QUERY_PARAMS = new Set([
  'token',
  'auth',
  'key',
  'session',
  'sessionid',
  'password',
  'passwd',
  'code',
  'access_token',
  'refresh_token',
  'state',
  'secret',
  'api_key',
  'apikey',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  '_ga',
]);

const SENSITIVE_DOMAINS = new Set([
  '1password.com',
  'bitwarden.com',
  'lastpass.com',
  'dashlane.com',
  'keepersecurity.com',
  'mail.google.com',
  'outlook.live.com',
  'mail.yahoo.com',
  'proton.me',
  'protonmail.com',
  'chase.com',
  'bankofamerica.com',
  'wellsfargo.com',
  'citi.com',
  'paypal.com',
  'venmo.com',
  'stripe.com',
]);

const INTERNAL_SCHEMES = ['chrome:', 'chrome-extension:', 'moz-extension:', 'edge:', 'about:', 'devtools:', 'view-source:'];

export class PrivacyGuard {
  /**
   * Check if URL or scheme should be completely ignored for privacy
   */
  public isSensitive(urlStr: string): boolean {
    if (!urlStr) return true;

    for (const scheme of INTERNAL_SCHEMES) {
      if (urlStr.startsWith(scheme)) return true;
    }

    try {
      const parsed = new URL(urlStr);
      const host = parsed.hostname.toLowerCase();

      // Check domain blacklist
      for (const domain of SENSITIVE_DOMAINS) {
        if (host === domain || host.endsWith(`.${domain}`)) return true;
      }

      // Check local IPs / private hostnames
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host.endsWith('.local') ||
        host.endsWith('.internal')
      ) {
        return true;
      }

      return false;
    } catch {
      return true;
    }
  }

  /**
   * Sanitizes a URL by removing all authentication, tracking, and sensitive tokens
   */
  public sanitizeUrl(urlStr: string): string {
    if (!urlStr) return '';
    try {
      const parsed = new URL(urlStr);
      // Remove hash fragment (often contains tokens in OAuth flows)
      parsed.hash = '';

      // Scrub query parameters
      const paramsToDelete: string[] = [];
      parsed.searchParams.forEach((_val, key) => {
        const lowerKey = key.toLowerCase();
        if (
          SENSITIVE_QUERY_PARAMS.has(lowerKey) ||
          lowerKey.startsWith('utm_') ||
          lowerKey.includes('token') ||
          lowerKey.includes('auth') ||
          lowerKey.includes('pass') ||
          lowerKey.includes('secret')
        ) {
          paramsToDelete.push(key);
        }
      });

      paramsToDelete.forEach((key) => parsed.searchParams.delete(key));

      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    } catch {
      return '';
    }
  }

  /**
   * Scrubs potential PII (emails, phone numbers, credit card patterns) from extracted text
   */
  public sanitizeText(text: string): string {
    if (!text) return '';

    return text
      // Scrub emails
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]')
      // Scrub credit card numbers
      .replace(/\b(?:\d{4}[ -]?){3}\d{4}\b/g, '[card]')
      // Scrub SSN patterns
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[ssn]')
      // Trim excessive whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export const privacyGuard = new PrivacyGuard();
