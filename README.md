# 🐾 Gremlin

A tiny gremlin that lives in your browser. It walks along the bottom of every
page, follows your cursor with its eyes, gets curious about your clicks,
startles when you scroll fast, and falls asleep when you go idle.

**Click the gremlin to pet it.** Petting restores happiness, which slowly
decays while it's awake. A grumpy gremlin walks slower and frowns.

## What's in the box

- **Popup** — rename your gremlin (🎲 for a random name), check its mood and
  happiness, see lifetime stats, and toggle it on/off globally.
- **Persistence** — name, happiness, position, and stats survive restarts via
  `storage.local`, synced live between the popup and every open tab.
- **Per-tab isolation** — the gremlin renders inside a closed shadow DOM with
  constructable stylesheets, so host pages can't style it and it can't leak
  styles into them (works on strict-CSP sites too).

## Developing

```bash
pnpm install
pnpm dev        # Chrome — loads the extension with hot reload
pnpm dev:firefox
pnpm compile    # typecheck
pnpm build      # production build into .output/
```

Then open `chrome://extensions`, enable developer mode, and load the
`.output/chrome-mv3` directory (the dev command prints the exact path).
