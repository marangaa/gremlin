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
    // Top-level window only
    if (window.self !== window.top) return;

    let controller: OrganismController | null = null;
    const config = await configStorage.getValue();
    const organismState = await organismStateStorage.getValue();

    const ui = await createShadowRootUi(ctx, {
      name: 'gremlin-organism-overlay',
      position: 'overlay',
      anchor: 'body',
      append: 'last',
      onMount: (_container: HTMLElement, shadow: ShadowRoot, host: HTMLElement) => {
        controller = new OrganismController(shadow, host, {
          organismId: config.organismId,
          name: config.name,
          dockPosition: config.dockPosition || 'bottom-right',
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

    // React to live messaging from background worker
    onMessage('triggerReaction', ({ data }) => {
      if (!controller) return;
      controller.setState(data.state);
      if (data.message) {
        controller.showRemark(data.message);
      }
    });

    // React to live config changes
    const unwatchConfig = configStorage.watch((newConfig: OrganismConfig | null) => {
      if (!newConfig) return;

      if (!newConfig.enabled && controller) {
        ui.remove();
      } else if (newConfig.enabled && !controller) {
        ui.mount();
      }

      if (controller) {
        controller.setOrganism(newConfig.organismId);
        controller.setDockPosition(newConfig.dockPosition || 'bottom-right');
      }
    });

    // Clean teardown on extension update/reload
    ctx.onInvalidated(() => {
      unwatchConfig();
      controller?.destroy();
      ui.remove();
    });
  },
});
