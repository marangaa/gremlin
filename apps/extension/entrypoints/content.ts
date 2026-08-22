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
    const disposers: Array<() => void> = [];

    ctx.onInvalidated(() => {
      disposers.splice(0).forEach((dispose) => dispose());
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

      // Handle live reactive messaging from background service worker
      const offReaction = onMessage('triggerReaction', ({ data }) => {
        if (!controller || ctx.isInvalid) return;
        controller.setState(data.state, Boolean(data.triggerEffect));
        if (data.message) {
          controller.showRemark(data.message);
        }
      });
      const offTestEffect = onMessage('testScreenEffect', ({ data }) => {
        if (!controller || ctx.isInvalid) return;
        controller.triggerCustomEffect(data.organismId);
      });
      disposers.push(offReaction, offTestEffect);

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

      const offConfigUpdated = onMessage('configUpdated', ({ data }) => {
        if (data?.config) {
          applyConfig(data.config);
        }
      });
      const unwatchConfig = configStorage.watch((newConfig: OrganismConfig | null) => {
        if (newConfig) {
          applyConfig(newConfig);
        }
      });
      disposers.push(offConfigUpdated, unwatchConfig);
    };

    // CONSENT GATE — nothing mounts and no page context is extracted until
    // the user completes first-run disclosure in the popup. Storage fallbacks
    // would otherwise wake the companion (and signal pipeline) pre-consent.
    const onboarded = await onboardedStorage.getValue();
    if (!onboarded) {
      const unwatchOnboarding = onboardedStorage.watch((value) => {
        if (value === true) {
          unwatchOnboarding();
          void start();
        }
      });
      disposers.push(unwatchOnboarding);
      return;
    }

    await start();
  },
});
