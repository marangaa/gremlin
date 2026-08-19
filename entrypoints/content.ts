import { OrganismController } from '@/lib/organism/controller';
import {
  configStorage,
  organismStateStorage,
  type OrganismConfig,
} from '@/lib/storage';
import { onMessage } from '@/lib/messaging';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  runAt: 'document_idle',
  async main(ctx) {
    // Only mount on top-level window, never inside iframes
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
          dockPosition: config.dockPosition || 'bottom-right',
          xFrac: config.xFrac,
          yFrac: config.yFrac,
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

    // Handle live reactive messaging from background service worker
    onMessage('triggerReaction', ({ data }) => {
      if (!controller) return;
      controller.setState(data.state);
      if (data.message) {
        controller.showRemark(data.message);
      }
    });

    // Handle live configuration changes from popup
    const unwatchConfig = configStorage.watch((newConfig: OrganismConfig | null) => {
      if (!newConfig) return;

      if (!newConfig.enabled && controller) {
        ui.remove();
      } else if (newConfig.enabled && !controller) {
        ui.mount();
      }

      if (controller) {
        controller.setOrganism(newConfig.organismId);
        if (newConfig.dockPosition !== 'custom') {
          controller.setDockPosition(newConfig.dockPosition || 'bottom-right');
        } else if (newConfig.xFrac !== undefined && newConfig.yFrac !== undefined) {
          controller.setPositionFraction(newConfig.xFrac, newConfig.yFrac);
        }
      }
    });

    // Clean teardown when extension is reloaded or disabled
    ctx.onInvalidated(() => {
      unwatchConfig();
      controller?.destroy();
      ui.remove();
    });
  },
});
