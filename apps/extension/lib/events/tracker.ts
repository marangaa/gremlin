import { eventHistoryStorage, type StoredHistoryEntry } from '../storage';
import type { PageSignalSnapshot } from './extractor';

export interface HistoryEntry {
  domain: string;
  title: string;
  timestamp: number;
  dwellSeconds: number;
}

export interface BrowserContext {
  currentDomain: string;
  currentTitle: string;
  timeOnCurrentDomainSec: number;
  recentDomains: string[];
  recentHistory: HistoryEntry[];
  recentTabSwitchesCount: number;
  isIdle: boolean;
  /**
   * Latest privacy-filtered DOM snapshot for the current domain, when one is
   * recent enough to be trustworthy. Feeds headings/excerpt/media state to
   * the AI evaluation.
   */
  pageSignal?: PageSignalSnapshot;
}

/** Page signals older than this are considered stale and excluded from context. */
const PAGE_SIGNAL_TTL_MS = 15 * 60 * 1000;
/** Upper bound of remembered domains to keep memory usage flat. */
const PAGE_SIGNAL_CAPACITY = 30;

class EventTracker {
  private currentDomain: string = '';
  private currentTitle: string = '';
  private domainStartTime: number = Date.now();
  private recentHistory: HistoryEntry[] = [];
  private tabSwitchTimestamps: number[] = [];
  private isIdleState: boolean = false;
  private initialized: boolean = false;
  private pageSignals: Map<string, PageSignalSnapshot> = new Map();

  public init() {
    if (this.initialized) return;
    this.initialized = true;

    // Load persisted history from storage
    void eventHistoryStorage.getValue().then((stored: StoredHistoryEntry[]) => {
      if (stored && Array.isArray(stored)) {
        this.recentHistory = stored.slice(0, 20);
      }
    });

    if (typeof browser === 'undefined' || !browser.tabs) return;

    // Track tab switches
    browser.tabs.onActivated.addListener(async (activeInfo) => {
      this.recordTabSwitch();
      try {
        const tab = await browser.tabs.get(activeInfo.tabId);
        this.updateCurrentTab(tab);
      } catch {
        // Tab may have closed
      }
    });

    // Track URL updates
    browser.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
      if (tab.active && (changeInfo.url || changeInfo.title)) {
        this.updateCurrentTab(tab);
      }
    });

    // Track idle state
    if (browser.idle) {
      browser.idle.setDetectionInterval(60);
      browser.idle.onStateChanged.addListener((newState) => {
        this.isIdleState = newState !== 'active';
      });
    }

    // Seed initial active tab
    void browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab) this.updateCurrentTab(tab);
    });
  }

  private extractDomain(urlStr?: string): string {
    if (!urlStr) return '';
    try {
      const url = new URL(urlStr);
      if (url.protocol.startsWith('http')) {
        return url.hostname.replace(/^www\./, '');
      }
      return url.protocol;
    } catch {
      return '';
    }
  }

  private recordTabSwitch() {
    const now = Date.now();
    this.tabSwitchTimestamps.push(now);
    // Keep only last 60 seconds of tab switches
    this.tabSwitchTimestamps = this.tabSwitchTimestamps.filter((t) => now - t <= 60000);
  }

  private updateCurrentTab(tab: { url?: string; title?: string }) {
    const newDomain = this.extractDomain(tab.url);
    const newTitle = tab.title || '';
    const now = Date.now();

    if (this.currentDomain && this.currentDomain !== newDomain) {
      const dwellSeconds = Math.max(1, Math.round((now - this.domainStartTime) / 1000));
      this.recentHistory.unshift({
        domain: this.currentDomain,
        title: this.currentTitle,
        timestamp: this.domainStartTime,
        dwellSeconds,
      });

      // Keep last 20 entries
      if (this.recentHistory.length > 20) {
        this.recentHistory.pop();
      }

      // Persist to storage for service worker sleep recovery
      void eventHistoryStorage.setValue(this.recentHistory as StoredHistoryEntry[]);

      this.currentDomain = newDomain;
      this.currentTitle = newTitle;
      this.domainStartTime = now;
    } else {
      if (newTitle) this.currentTitle = newTitle;
      if (!this.currentDomain) {
        this.currentDomain = newDomain;
        this.domainStartTime = now;
      }
    }
  }

  /**
   * Records a privacy-filtered page snapshot delivered by a content script.
   * Keyed by domain; oldest entries evicted beyond capacity.
   */
  public recordPageSignal(signal: PageSignalSnapshot) {
    if (!signal?.domain) return;

    // Evict stale entries first to keep the map bounded.
    const now = Date.now();
    for (const [domain, existing] of this.pageSignals) {
      if (now - existing.timestamp > PAGE_SIGNAL_TTL_MS) {
        this.pageSignals.delete(domain);
      }
    }
    if (this.pageSignals.size >= PAGE_SIGNAL_CAPACITY && !this.pageSignals.has(signal.domain)) {
      const oldest = [...this.pageSignals.entries()].sort(
        (a, b) => a[1].timestamp - b[1].timestamp,
      )[0];
      if (oldest) this.pageSignals.delete(oldest[0]);
    }

    this.pageSignals.set(signal.domain, signal);
  }

  public getContext(): BrowserContext {
    const now = Date.now();
    const currentDwell = Math.max(0, Math.round((now - this.domainStartTime) / 1000));

    // Tab switches in last 20 seconds
    const recentSwitches = this.tabSwitchTimestamps.filter((t) => now - t <= 20000).length;

    const recentDomains = Array.from(
      new Set(this.recentHistory.map((h) => h.domain).filter(Boolean)),
    ).slice(0, 8);

    const pageSignal = this.pageSignals.get(this.currentDomain);
    const isSignalFresh =
      pageSignal && now - pageSignal.timestamp <= PAGE_SIGNAL_TTL_MS;

    return {
      currentDomain: this.currentDomain,
      currentTitle: this.currentTitle,
      timeOnCurrentDomainSec: currentDwell,
      recentDomains,
      recentHistory: [...this.recentHistory],
      recentTabSwitchesCount: recentSwitches,
      isIdle: this.isIdleState,
      pageSignal: isSignalFresh ? pageSignal : undefined,
    };
  }

  public clearHistory() {
    this.recentHistory = [];
    this.tabSwitchTimestamps = [];
    this.pageSignals.clear();
    this.domainStartTime = Date.now();
    void eventHistoryStorage.setValue([]);
  }
}

export const eventTracker = new EventTracker();
