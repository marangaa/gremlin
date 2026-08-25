import { registerTelemetry } from 'ai';

/**
 * AI SDK DevTools — development-only observability for every judge call:
 * prompts, structured outputs, tool round-trips, escalation reasoning,
 * token usage. View with `npx @ai-sdk/devtools@latest`, then open
 * http://localhost:4983 while the extension's service worker is running.
 *
 * The dynamic import keeps the package out of production bundles entirely:
 * import.meta.env.DEV is statically replaced by Vite, so this block vanishes
 * in release builds and `registerTelemetry` is never called there.
 */
if (import.meta.env.DEV) {
  void import('@ai-sdk/devtools')
    .then(({ DevToolsTelemetry }) => {
      registerTelemetry(DevToolsTelemetry());
    })
    .catch(() => {
      // Viewer not running / blocked — evaluations continue unaffected.
    });
}

export {};
