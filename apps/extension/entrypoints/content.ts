import { OrganismController } from '@/lib/organism/controller';
import { pageExtractor } from '@/lib/events/extractor';
import {
  configStorage,
  onboardedStorage,
  organismStateStorage,
  type OrganismConfig,
} from '@/lib/storage';
import { onMessage, sendMessage } from '@/lib/messaging';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  runAt: 'document_idle',
  async main(ctx) {
    // Only mount on top-level window, never inside embedded iframes
    if (window.self !== window.top) return;

    let controller: OrganismController | null = null;
    const uiHolder: { ui: { mount: () => void; remove: () => void } | null } = { ui: null };

    /**
     * Teardown — deliberately touches ONLY DOM and timers.
     *
     * Per the WXT lifecycle docs, invalidation unwinds everything registered
     * through ctx (addEventListener/setTimeout/setInterval/requestAnimationFrame)
     * via its abort signal, whose unwind path never calls extension bindings.
     * Storage watchers and messaging listeners are intentionally NOT
     * unregistered here: once invalidated, Chrome stops dispatching events to
     * them entirely, so removal is unnecessary — and because every binding
     * METHOD call (removeListener included) throws "Extension context
     * invalidated" on an orphaned script, calling them during teardown is the
     * one way this handler could ever throw. Memory is reclaimed when the tab
     * navigates or unloads.
     */
    ctx.onInvalidated(() => {
      controller?.destroy();
      controller = null;
      uiHolder.ui?.remove();
      uiHolder.ui = null;
      document.querySelectorAll('gremlin-organism-viewport').forEach((el) => el.remove());
    });

    const start = async () => {
      if (uiHolder.ui || ctx.isInvalid) return;

      const config = await configStorage.getValue();
      const organismState = await organismStateStorage.getValue();

      const ui = await createShadowRootUi(ctx, {
        name: 'gremlin-organism-viewport',
        position: 'overlay',
        anchor: 'html',
        append: 'last',
        onMount: (_container: HTMLElement, shadow: ShadowRoot, host: HTMLElement) => {
          // Enforce absolute viewport attachment in light DOM so document scrolling NEVER moves the host
          host.style.cssText = `
            position: fixed !important;
            top: 0px !important;
            left: 0px !important;
            width: 100vw !important;
            height: 100vh !important;
            pointer-events: none !important;
            z-index: 2147483647 !important;
            margin: 0px !important;
            padding: 0px !important;
            border: none !important;
            overflow: visible !important;
          `;

          controller = new OrganismController(shadow, host, {
            organismId: config.organismId,
            name: config.name,
            xFrac: config.xFrac,
            yFrac: config.yFrac,
            soundEnabled: config.soundEnabled,
            volume: config.volume,
            effectsEnabled: config.effectsEnabled,
            initialState: organismState.state,
          });

          if (config.enabled) {
            controller.mount();
          }
        },
        onRemove: () => {
          controller?.destroy();
          controller = null;
        },
      });

      uiHolder.ui = ui;
      if (config.enabled) {
        ui.mount();
      }

      // Extract page metadata on initial browser idle and relay it to the
      // background service worker for AI evaluation context.
      const pushPageSignal = () => {
        pageExtractor.extractOnIdle((snapshot) => {
          if (!snapshot || ctx.isInvalid) return;
          void sendMessage('pageSignal', { signal: snapshot });
        });
      };
      pushPageSignal();

      // Native WXT SPA Navigation detection (e.g. YouTube, GitHub, Twitter)
      ctx.addEventListener(window, 'wxt:locationchange', () => {
        if (ctx.isInvalid) return;
        pushPageSignal();
      });

      // Handle live reactive messaging from background service worker. The
      // returned unsubscribe closures are intentionally discarded — see the
      // teardown JSDoc above.
      onMessage('triggerReaction', ({ data }) => {
        if (!controller || ctx.isInvalid) return;
        controller.setState(data.state, Boolean(data.triggerEffect));
        if (data.message) {
          controller.showRemark(data.message);
        }
      });

      onMessage('testScreenEffect', ({ data }) => {
        if (!controller || ctx.isInvalid) return;
        controller.triggerCustomEffect(data.organismId);
      });

      const applyConfig = (newConfig: OrganismConfig) => {
        if (ctx.isInvalid) return;

        if (!newConfig.enabled && controller) {
          ui.remove();
        } else if (newConfig.enabled && !controller) {
          ui.mount();
        }

        if (controller) {
          controller.setOrganism(newConfig.organismId);
          controller.setSoundSettings(newConfig.soundEnabled, newConfig.volume);
          controller.setEffectsEnabled(newConfig.effectsEnabled);

          if (newConfig.xFrac !== undefined && newConfig.yFrac !== undefined) {
            controller.setPositionFraction(newConfig.xFrac, newConfig.yFrac);
          }
        }
      };

      onMessage('configUpdated', ({ data }) => {
        if (data?.config) {
          applyConfig(data.config);
        }
      });

      // Handle live configuration changes from WXT storage across all open tabs
      configStorage.watch((newConfig: OrganismConfig | null) => {
        if (newConfig) {
          applyConfig(newConfig);
        }
      });
    };

    /**
     * CONSENT GATE — nothing mounts and no page context is extracted until
     * the user completes first-run disclosure in the popup. Storage fallbacks
     * (`enabled: true`, default companion) would otherwise wake the companion
     * pre-consent on a fresh install, so the entire start sequence defers via
     * an {@link onboardedStorage} watch instead of reading config alone.
     */
    const onboarded = await onboardedStorage.getValue();
    if (!onboarded) {
      // One-shot self-removal while the context is still alive; if consent
      // never arrives, the listener simply dies with the page.
      const unwatchOnboarding = onboardedStorage.watch((value) => {
        if (value === true) {
          unwatchOnboarding();
          void start();
        }
      });
      return;
    }

    await start();

    /**
     * ORPHAN HEARTBEAT — WXT detects invalidation lazily: the `runtime.id`
     * check lives inside the ctx.isInvalid/isValid getters, and its active
     * events (`stopOldScripts`) only cover reload/update, where a newer script
     * announces itself. On UNINSTALL Chrome orphans the script silently, so
     * without a reader nothing ever tears down and the companion lingers until
     * refresh. This heartbeat makes ctx.setInterval read isValid every tick,
     * which trips the getter, notifies the context, and drives the DOM-only
     * teardown above through the framework's own abort signal.
     */
    ctx.setInterval(() => {}, 2_500);
  },
});
