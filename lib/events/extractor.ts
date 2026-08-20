import { privacyGuard } from './privacy';

export interface PageSignalSnapshot {
  urlClean: string;
  domain: string;
  title: string;
  description: string;
  siteName: string;
  headings: string[];
  articleSnippet: string;
  estimatedReadTimeMin: number;
  scrollDepthPercent: number;
  timestamp: number;
}

export class PageContentExtractor {
  /**
   * Extracts clean, privacy-filtered metadata from the active webpage.
   * Scoped to prevent reading form elements or password inputs.
   */
  public extract(): PageSignalSnapshot | null {
    if (typeof document === 'undefined' || typeof window === 'undefined') return null;

    const rawUrl = window.location.href;
    if (privacyGuard.isSensitive(rawUrl)) {
      return null;
    }

    const urlClean = privacyGuard.sanitizeUrl(rawUrl);
    const domain = window.location.hostname;

    // 1. Meta Tags & Site Name
    const title = privacyGuard.sanitizeText(document.title || '');
    const metaDescEl =
      document.querySelector('meta[name="description"]') ||
      document.querySelector('meta[property="og:description"]') ||
      document.querySelector('meta[name="twitter:description"]');
    const description = privacyGuard.sanitizeText(metaDescEl?.getAttribute('content') || '');

    const siteNameEl =
      document.querySelector('meta[property="og:site_name"]') ||
      document.querySelector('meta[name="application-name"]');
    const siteName = privacyGuard.sanitizeText(siteNameEl?.getAttribute('content') || '');

    // 2. Headings (scoped to h1 and h2)
    const headingElements = Array.from(document.querySelectorAll('h1, h2')).slice(0, 5);
    const headings = headingElements
      .map((el) => privacyGuard.sanitizeText(el.textContent || ''))
      .filter((h) => h.length > 2 && h.length < 100);

    // 3. Main Text Snippet & Word Count (Scoped to article/main to avoid sidebars/nav)
    const mainContainer =
      document.querySelector('article') ||
      document.querySelector('main') ||
      document.querySelector('[role="main"]') ||
      document.body;

    let articleSnippet = '';
    let wordCount = 0;

    if (mainContainer) {
      // Extract paragraphs without reading input/textarea/password tags
      const paragraphs = Array.from(mainContainer.querySelectorAll('p'))
        .filter((p) => !p.closest('form') && !p.closest('nav') && !p.closest('footer'))
        .slice(0, 3)
        .map((p) => p.textContent || '')
        .join(' ');

      const sanitized = privacyGuard.sanitizeText(paragraphs);
      articleSnippet = sanitized.slice(0, 320);
      wordCount = sanitized.split(/\s+/).filter(Boolean).length;
    }

    const estimatedReadTimeMin = Math.max(1, Math.ceil(wordCount / 200));

    // 4. Scroll Depth
    const scrollHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body?.scrollHeight || 0,
      window.innerHeight,
    );
    const scrollPos = window.scrollY + window.innerHeight;
    const scrollDepthPercent = Math.min(100, Math.round((scrollPos / scrollHeight) * 100));

    return {
      urlClean,
      domain,
      title,
      description,
      siteName,
      headings,
      articleSnippet,
      estimatedReadTimeMin,
      scrollDepthPercent,
      timestamp: Date.now(),
    };
  }

  /**
   * Runs extraction during browser idle time
   */
  public extractOnIdle(callback: (snapshot: PageSignalSnapshot | null) => void) {
    if (typeof window === 'undefined') return;

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(
        () => {
          callback(this.extract());
        },
        { timeout: 1500 },
      );
    } else {
      setTimeout(() => {
        callback(this.extract());
      }, 500);
    }
  }
}

export const pageExtractor = new PageContentExtractor();
