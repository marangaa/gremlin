import { OrganismController } from '@/lib/organism/controller';
import { pageExtractor } from '@/lib/events/extractor';
import {
  configStorage,
  onboardedStorage,
  organismStateStorage,
  userSessionStorage,
  type OrganismConfig,
} from '@/lib/storage';
import { onMessage, sendMessage } from '@/lib/messaging';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'manual',
  runAt: 'document_idle',
  async main(ctx) {
    /** Only mount on top-level window, never inside embedded iframes */
    if (window.self !== window.top) return;

    /**
     * Web-to-Extension Authentication Bridge.
     * Listens for successful login/signup events broadcast from the Gremlin Web app
     * (e.g. localhost:5173 or production domain) and synchronizes user session storage.
     */
    ctx.addEventListener(window, 'message', async (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data?.source === 'gremlin-web' && event.data?.type === 'GREMLIN_AUTH_SUCCESS') {
        const user = event.data.payload?.user;
        if (user?.email) {
          const plan = user.plan === 'pro' ? 'pro' : 'free';
          await userSessionStorage.setValue({
            isLoggedIn: true,
            email: user.email,
            userId: user.id,
            plan,
          });
          const cfg = await configStorage.getValue();
          await configStorage.setValue({
            ...cfg,
            mode: 'cloud',
          });
          await onboardedStorage.setValue(true);

          try {
            const { onAccountConnected } = await import('@/lib/sync/engine');
            await onAccountConnected();
          } catch {
            // Non-blocking sync error
          }
        }
      }
    });

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
          /** Enforce absolute viewport attachment in light DOM so document scrolling NEVER moves the host */
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
            ctx,
            organismId: config.organismId,
            name: config.name,
            xFrac: config.xFrac,
            yFrac: config.yFrac,
            soundEnabled: config.soundEnabled,
            volume: config.volume,
            effectsEnabled: config.effectsEnabled,
            effectsIntensity: config.effectsIntensity,
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

      /**
       * Extract page metadata on initial browser idle and relay it to the
       * background service worker for AI evaluation context.
       *
       * The send is deliberately fire-and-forget with rejection swallowed:
       * during extension reloads a freshly injected script can outrun the
       * booting service worker ("Could not establish connection. Receiving
       * end does not exist."), and mid-send invalidations race the guard
       * below. Both are expected, harmless drops of ephemeral telemetry —
       * the next navigation re-pushes.
       */
      const pushPageSignal = () => {
        pageExtractor.extractOnIdle((snapshot) => {
          if (!snapshot || ctx.isInvalid) return;
          sendMessage('pageSignal', { signal: snapshot }).catch(() => {});
        });
      };
      pushPageSignal();

      /** Native WXT SPA Navigation detection (e.g. YouTube, GitHub, Twitter) */
      ctx.addEventListener(window, 'wxt:locationchange', () => {
        if (ctx.isInvalid) return;
        pushPageSignal();
      });

      /**
       * Handle live reactive messaging from background service worker. The
       * returned unsubscribe closures are intentionally discarded — see the
       * teardown JSDoc above.
       */
      onMessage('triggerReaction', ({ data }) => {
        if (!controller || ctx.isInvalid) return;

        const isIntervention = Boolean(
          data.interventionKind &&
            data.interventionKind !== 'observe' &&
            data.message?.trim(),
        );

        if (isIntervention && data.message) {
          // Dynamic 50/50 randomized split between:
          // 1. In-place text roast replacement in the DOM (pure roast)
          // 2. Character physical screen heist (with roast delivered inside or alongside)
          const pickScreenHeist = Math.random() < 0.5;

          if (pickScreenHeist) {
            // Screen heist: companion flies to target and performs signature heist,
            // while passing the LLM roast to be pinned/stamped/displayed.
            controller.setState(data.state, true, data.message);
          } else {
            // Roast replacement: seamlessly swaps the distraction text with the LLM roast.
            controller.setState(data.state, false);
            controller.triggerRoast(data.message);
          }
        } else {
          // Non-intervention message (e.g. manual sprint start confirmation or poke)
          controller.setState(data.state, Boolean(data.triggerEffect));
          if (data.message) {
            controller.showRemark(data.message, 3000);
          }
        }
      });

      onMessage('testScreenEffect', ({ data }) => {
        if (!controller || ctx.isInvalid) return;
        try {
          controller.testEffect(data.organismId);
        } catch {
          /** Test hooks must never throw into the messaging layer. */
        }
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
          controller.setEffectsIntensity(newConfig.effectsIntensity ?? 0.45);

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

      /** Handle live configuration changes from WXT storage across all open tabs */
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
      /**
       * One-shot self-removal while the context is still alive; if consent
       * never arrives, the listener simply dies with the page.
       */
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
