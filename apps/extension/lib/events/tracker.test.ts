import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { Browser } from 'wxt/browser';

async function freshTracker() {
  vi.resetModules();
  const mod = await import('./tracker');
  return mod.eventTracker;
}

function makeTab(id: number, url: string, title = ''): Browser.tabs.Tab {
  return {
    id,
    index: 0,
    windowId: 1,
    highlighted: true,
    active: true,
    pinned: false,
    incognito: false,
    selected: true,
    discarded: false,
    autoDiscardable: false,
    groupId: -1,
    url,
    title,
  } as Browser.tabs.Tab;
}

/**
 * fake-browser's tabs.create/tabs.query internally call its unimplemented windows.*
 * stubs through module-scope references that cannot be spied on. We therefore bypass
 * its tab state entirely: tracker.init() reads the active tab via browser.tabs.query
 * and listeners resolve tabs via browser.tabs.get — both are intercepted here and
 * backed by a plain in-test tab registry.
 */
const tabRegistry = new Map<number, Browser.tabs.Tab>();
let activeTab: Browser.tabs.Tab | undefined;
let nextTabId = 1;

/** Seeds a tab and marks it as the active/current-window tab. */
async function seedWindow(url: string, title = ''): Promise<Browser.tabs.Tab> {
  const tab = makeTab(nextTabId++, url, title);
  tabRegistry.set(tab.id!, tab);
  activeTab = tab;
  return tab;
}

async function flush() {
  await vi.advanceTimersByTimeAsync(0);
}

beforeEach(() => {
  fakeBrowser.reset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  tabRegistry.clear();
  activeTab = undefined;
  nextTabId = 1;

  // fake-browser implements the idle namespace but throws on unimplemented members
  vi.spyOn(browser.idle, 'setDetectionInterval').mockImplementation(() => {});
  vi.spyOn(browser.idle, 'onStateChanged', 'get').mockReturnValue({
    addListener: () => {},
  } as unknown as typeof browser.idle.onStateChanged);

  // Back the query/get surface used by EventTracker with the local registry.
  vi.spyOn(browser.tabs, 'query').mockImplementation(async () =>
    activeTab ? [activeTab] : [],
  );
  vi.spyOn(browser.tabs, 'get').mockImplementation(async (id: number) => {
    const t = tabRegistry.get(id);
    if (t) activeTab = t;
    return t;
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('EventTracker', () => {
  it('extracts hostname stripped of www. and seeds the active tab on init', async () => {
    const tracker = await freshTracker();
    await seedWindow('https://www.github.com/gremlin');
    tracker.init();
    await flush();

    expect(tracker.getContext().currentDomain).toBe('github.com');
  });

  it('records a history entry with dwell time when switching domains', async () => {
    const tracker = await freshTracker();
    const tab = await seedWindow('https://docs.example.com/guide');
    tracker.init();
    await flush();

    // Dwell 45 seconds on docs.example.com
    vi.setSystemTime(new Date(Date.now() + 45_000));

    await fakeBrowser.tabs.onUpdated.trigger(
      tab.id!,
      { url: 'https://www.reddit.com/r/aww' },
      makeTab(tab.id!, 'https://www.reddit.com/r/aww', 'r/aww'),
    );
    await flush();

    const ctx = tracker.getContext();
    expect(ctx.currentDomain).toBe('reddit.com');
    expect(ctx.recentHistory[0]?.domain).toBe('docs.example.com');
    expect(ctx.recentHistory[0]?.dwellSeconds).toBe(45);
  });

  it('maps non-http protocols to the protocol string', async () => {
    const tracker = await freshTracker();
    const tab = await seedWindow('https://a.com/x');
    tracker.init();
    await flush();

    await fakeBrowser.tabs.onUpdated.trigger(
      tab.id!,
      { url: 'chrome://newtab' },
      makeTab(tab.id!, 'chrome://newtab', 'New Tab'),
    );
    await flush();

    expect(tracker.getContext().currentDomain).toBe('chrome:');
  });

  it('caps rolling history at 20 entries', async () => {
    const tracker = await freshTracker();
    const tab = await seedWindow('https://d0.com/');
    tracker.init();
    await flush();

    for (let i = 1; i <= 25; i++) {
      vi.setSystemTime(new Date(Date.now() + 5_000));
      await fakeBrowser.tabs.onUpdated.trigger(
        tab.id!,
        { url: `https://d${i}.com/` },
        makeTab(tab.id!, `https://d${i}.com/`, `D${i}`),
      );
      await flush();
    }

    expect(tracker.getContext().recentHistory.length).toBe(20);
  });

  it('counts recent tab switches within a 20s window', async () => {
    const tracker = await freshTracker();
    const first = await seedWindow('https://a.com/');
    const second = await seedWindow('https://b.com/');
    tracker.init();
    await flush();

    await fakeBrowser.tabs.onActivated.trigger({ tabId: first.id!, windowId: 1 });
    vi.setSystemTime(new Date(Date.now() + 1_000));
    await fakeBrowser.tabs.onActivated.trigger({ tabId: second.id!, windowId: 1 });
    await flush();

    expect(tracker.getContext().recentTabSwitchesCount).toBeGreaterThanOrEqual(2);
  });

  it('clearHistory resets in-memory history and persists the empty state', async () => {
    const tracker = await freshTracker();
    const tab = await seedWindow('https://one.com/');
    tracker.init();
    await flush();

    await fakeBrowser.tabs.onUpdated.trigger(
      tab.id!,
      { url: 'https://two.com/' },
      makeTab(tab.id!, 'https://two.com/'),
    );
    await flush();
    expect(tracker.getContext().recentHistory.length).toBeGreaterThan(0);

    tracker.clearHistory();
    await flush();

    const ctx = tracker.getContext();
    expect(ctx.recentHistory.length).toBe(0);
    const persisted = await browser.storage.local.get('eventHistory');
    expect(persisted['eventHistory']).toEqual([]);
  });

  it('restores persisted history for service worker sleep recovery', async () => {
    const seeded = [
      { domain: 'old.com', title: 'Old', timestamp: 1, dwellSeconds: 10 },
      { domain: 'older.com', title: 'Older', timestamp: 0, dwellSeconds: 20 },
    ];
    await browser.storage.local.set({ eventHistory: seeded });

    const tracker = await freshTracker();
    await seedWindow('https://new.com/');
    tracker.init();
    await flush();

    const ctx = tracker.getContext();
    expect(ctx.recentDomains).toContain('old.com');
    expect(ctx.recentDomains).toContain('older.com');
  });
});
