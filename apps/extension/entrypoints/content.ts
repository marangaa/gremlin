import { OrganismController } from '@/lib/organism/controller';
import { pageExtractor } from '@/lib/events/extractor';
import {
  configStorage,
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
    const unwatchConfig = configStorage.watch((newConfig: OrganismConfig | null) => {
      if (newConfig) {
        applyConfig(newConfig);
      }
    });

    // Clean teardown when extension is uninstalled, disabled, or reloaded
    ctx.onInvalidated(() => {
      unwatchConfig();
      controller?.destroy();
      ui.remove();
      document.querySelectorAll('gremlin-organism-viewport').forEach((el) => el.remove());
    });
  },
});
