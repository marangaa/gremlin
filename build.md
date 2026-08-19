# Personal AI Organism: Chrome Extension Build Brief

## 1. The idea

Build a small AI creature that lives in the browser.

For v1, do not try to build a complete productivity platform, personal knowledge graph, or "AI that understands your entire life." Those are possible future directions.

The immediate product is much simpler:

> **A little AI organism watches what you are doing in the browser and reacts.**

It can sit at the edge of the screen, watch, wander, sleep, get suspicious, become annoyed, celebrate, or make a short sarcastic remark.

The long-term system can evolve toward persistent personal memory and deeper understanding of the user. For now, the goal is to prove one thing:

> **Does having a little intelligent creature living in your browser feel compelling?**

If yes, everything else can evolve from there.

---

## 2. The first experience

A user installs the Chrome extension.

They open a normal website.

A small character appears near the edge of the screen.

It idles.

It watches.

The user changes tabs, navigates, scrolls, searches, works, gets distracted, etc.

The character reacts to selected events.

For example:

* User stays on a page: character watches.
* User repeatedly switches tabs: character looks confused.
* User opens a distracting site after setting a goal: character walks into view.
* User returns to the intended task: character calms down.
* User spends a suspicious amount of time on the same distraction: character gets annoyed.
* User finishes a task: character celebrates.
* User is inactive: character sleeps.

The goal is **not perfect behavioral classification**.

The goal is to make the browser feel alive.

---

## 3. Product principle

Do not initially position this as:

> "AI productivity assistant."

Position the underlying experience as:

> **There is a little AI creature living in your browser.**

The productivity/usefulness layer can emerge later.

The organism itself is the first product primitive.

---

# 4. Recommended stack

## Extension framework: WXT

Use **WXT + TypeScript**.

WXT is a modern web-extension framework built around Vite and supports Manifest V3, TypeScript, content scripts, background workers and cross-browser extension development.

Reference: WXT documentation and GitHub repository.

Why WXT:

* good Manifest V3 support
* Vite development experience
* TypeScript-first
* straightforward content-script architecture
* file-based entrypoints
* fast development reload
* Chrome-first but not locked to Chrome forever
* does not hide the underlying extension APIs from us

Alternative options such as Plasmo are viable, but there is no reason to introduce additional abstraction unless it gives us a concrete advantage.

For this project, WXT is the default choice.

---

## UI

Use React where it actually helps:

* popup
* settings
* onboarding
* configuration UI

Do not build the organism itself as a giant React application.

The organism can simply be a DOM element, image/sprite animation, or Canvas renderer.

---

## AI

Use the **Vercel AI SDK**.

The AI SDK should sit above the browser-observation layer.

Potential architecture:

```text
Browser events
      ↓
local aggregation
      ↓
meaningful behavioral event
      ↓
AI reasoning
      ↓
structured organism decision
      ↓
animation / speech / action
```

Do **not** call an AI model for every browser event.

That would be expensive, slow, and architecturally ridiculous.

The local event system should determine when something is worth asking the model about.

The model should return structured information rather than arbitrary prose.

Example:

```ts
{
  shouldReact: true,
  mood: "suspicious",
  animation: "peek",
  message: "Interesting choice.",
  intensity: 0.4
}
```

The rendering layer decides how to actually display the state.

---

# 5. Chrome architecture

Conceptually:

```text
                         Chrome
                           |
              +------------+------------+
              |                         |
       Background /               Content Script
       Service Worker              / Organism
              |                         |
       browser-level                 webpage
          events                       |
              |                         |
              +-----------+-------------+
                          |
                     local state
                          |
                     AI decision
                          |
                  organism state
                          |
                   sprite renderer
```

## Background/service worker

Responsible for browser-level events and coordination.

Potential events:

* tab created
* tab activated
* tab updated
* navigation
* tab closed
* browser idle/active state
* communication between tabs/content scripts

Important: Manifest V3 service workers are not permanent background processes. Important state should therefore be persisted rather than relying on global service-worker memory.

## Content script

This is where the organism physically lives.

It can:

* observe the webpage DOM
* observe selected user interaction events
* inject the organism
* render the character
* display speech bubbles
* animate the character
* communicate with the background worker

WXT provides content-script entrypoints for this.

---

# 6. Canvas vs DOM

Canvas is useful, but it is not required for v1.

The Canvas API is a drawing/rendering API. It does **not** provide special DOM access.

The content script provides access to the webpage's DOM.

Canvas can then be used as the organism's visual body.

For example:

```text
Web page
┌──────────────────────────────────────┐
│                                      │
│          actual website              │
│                                      │
│                              👀      │
│                           creature   │
└──────────────────────────────────────┘
```

The extension can inject a transparent overlay and render the character on top of the webpage.

For v1, consider the simplest implementation first:

### Option A: DOM + `<img>` + CSS animation

Pros:

* extremely simple
* easy sprite-sheet animation
* easy positioning
* easy debugging

### Option B: Canvas

Pros:

* richer animation
* arbitrary movement
* particles/effects
* easier composition
* more game-like behavior
* potentially multiple entities

Recommendation:

**Start with DOM/CSS if it is sufficient. Move to Canvas once the organism needs richer movement or effects.**

Canvas is not the interesting part of the product. It is merely the organism's body.

---

# 7. The organism should have states

Do not ask an LLM to control every animation frame.

Use a deterministic state/animation system.

Initial states:

```text
IDLE
WATCHING
CURIOUS
CONFUSED
SUSPICIOUS
ANNOYED
HAPPY
CELEBRATING
SLEEPING
SHOCKED
THINKING
WALKING
HIDING
```

Each state maps to an animation.

For example:

```text
SUSPICIOUS
    ↓
peek animation
    ↓
speech bubble
    ↓
return to idle
```

The AI decides **when the character's state should change**.

The animation system decides **how that state looks**.

That separation should remain explicit.

---

# 8. The character should not constantly interrupt

The organism needs a cooldown and confidence system.

Basic logic:

```text
event occurs
      ↓
is it meaningful?
      ↓
does the organism have something useful/funny to say?
      ↓
has it recently interrupted?
      ↓
       yes → remain quiet
       no  → react
```

The character should sometimes simply watch.

That is important.

A little creature silently sitting in the corner and looking at you can be more compelling than another notification.

The organism should feel present, not needy.

---

# 9. Initial browser signals

Keep collection minimal.

Potential signals:

* current tab/domain
* page title
* navigation
* tab switching
* time spent on a page/domain
* scrolling
* clicks
* activity/idle state
* repeated visits
* basic page metadata

Avoid collecting page contents unless there is an explicit reason.

Do not collect:

* passwords
* form contents
* raw keystrokes
* screenshots
* unrelated sensitive information

Do not accidentally build a surveillance system while trying to build a funny browser pet.

---

# 10. Goal-driven behavior

The original idea still belongs in v1.

The user can establish a goal:

> "Work on my project for 45 minutes."

The organism watches browser behavior.

Example:

```text
Goal:
Build Chrome extension

        ↓

GitHub
        ↓

Chrome documentation
        ↓

Local development
        ↓

Reddit
        ↓

Detected divergence
        ↓

character walks into view
        ↓

"Interesting."
```

If the user keeps browsing Reddit:

> "We were building something."

If the user returns to work:

The character walks away and resumes watching.

This is enough for the first meaningful demo.

---

# 11. Character personalities

Characters should be configuration/data rather than hardcoded application logic.

Potential initial characters:

## Detective

Observational, suspicious, analytical.

Example:

> "Interesting. That's the third time you've searched for this."

## Gremlin

Chaotic and annoying.

Example:

> "Reddit again."

## Coach

Aggressive but not abusive.

Example:

> "You said ten minutes. It has been forty."

## Cute companion

Gentle and curious.

Example:

> "You seem distracted."

## Corporate manager

Dry and bureaucratic.

Example:

> "This activity has been escalated to management."

The user should eventually be able to install character packs.

That could become a community ecosystem later.

---

# 12. Sprite and animation assets

Do not generate every asset ourselves initially.

Use existing assets to prototype.

## Kenney

Kenney is probably the first place to investigate.

Kenney provides a large library of game assets, including characters, sprites, UI assets and animation-oriented packs. Many of the assets are CC0/public domain and suitable for commercial use.

Relevant categories/packs include:

* RPG Base
* New Platformer Pack
* Monster Builder Pack
* various 2D character assets

Also investigate **Asset Forge**, which can be used to construct 3D characters and export 2D sprites.

Reference: Kenney website and asset library.

## itch.io

Search for:

* pixel character sprite
* animated character sprite
* character sprite sheet
* pixel NPC
* creature sprite
* RPG character animation
* idle walk animation

There are many free and paid packs.

Important:

**Check the license of every individual pack before shipping it.**

"Free download" does not automatically mean "commercial redistribution permitted."

## OpenGameArt

Useful for finding open sprite sheets and animations.

Again, check each asset's license.

---

# 13. Do sprite generators exist?

Yes.

AI-assisted pixel-art and sprite generation is already a thing.

Tools such as **Ludo.ai's Pixel Art Sprite Generator** can generate pixel-art characters and sprite sheets from prompts and can assist with animation frames.

This is worth exploring.

However:

**Do not make AI-generated sprites a dependency for v1.**

The first prototype only needs one coherent character with a handful of states.

The important thing is consistency.

A mediocre but coherent sprite is better than ten gorgeous but visually inconsistent AI-generated frames.

Potential future workflow:

```text
character concept
      ↓
generate base sprite
      ↓
generate animation frames
      ↓
clean/normalize frames
      ↓
export sprite sheet
      ↓
organism renderer
```

We should also investigate newer sprite-generation tools as the project develops because this area is changing quickly.

---

# 14. Initial animation set

We do not need 50 animations.

Start with:

```text
idle
walk
peek
look
think
happy
angry
sleep
surprised
```

Optional:

```text
celebrate
hide
point
shake-head
```

This is enough to create a surprisingly expressive character.

The organism is not a game character.

It is a browser companion.

---

# 15. Sprite implementation

A sprite sheet can be treated as a grid of animation frames.

### CSS approach

```text
sprite-sheet.png
       ↓
background-position
       ↓
CSS animation / steps()
```

### Canvas approach

```text
sprite-sheet.png
       ↓
drawImage()
       ↓
crop frame
       ↓
draw frame at position
```

Normalize all imported sprite sheets into a common internal format.

For example:

```text
character/
  idle/
    0.png
    1.png
    2.png
  walk/
    0.png
    1.png
    2.png
  angry/
    0.png
    1.png
    2.png
```

Or keep original sheets and define animation metadata:

```ts
{
  idle: {
    frames: [0, 1, 2, 3],
    fps: 6,
    loop: true
  }
}
```

This will make adding characters much easier.

---

# 16. Visual positioning

Initial organism position:

```css
position: fixed;
right: 16px;
bottom: 16px;
```

Use a high z-index.

The organism should normally have:

```css
pointer-events: none;
```

unless the user explicitly interacts with it.

It should be able to:

* sit in a corner
* walk a short distance
* peek from an edge
* move toward a speech bubble
* disappear
* return later

Do not cover important page content.

---

# 17. Speech bubbles

Keep remarks short.

Bad:

> "Based on an analysis of your browsing behavior, it appears that you have deviated from your stated objective."

Good:

> "We were working."

Good:

> "Interesting."

Good:

> "Reddit again."

Good:

> "Suspicious."

Good:

> "You opened YouTube."

The organism should sound like a character, not an enterprise chatbot.

---

# 18. AI architecture

The AI should receive a compact behavioral context rather than the entire browser history on every call.

Example:

```ts
type BrowserContext = {
  goal?: string
  currentDomain: string
  currentTitle?: string
  recentDomains: string[]
  recentEvents: BrowserEvent[]
  sessionDuration: number
  timeOnCurrentDomain: number
  recentInterruptions: number
  characterState: string
}
```

The AI returns structured output:

```ts
type OrganismDecision = {
  shouldReact: boolean
  state:
    | "idle"
    | "watching"
    | "curious"
    | "confused"
    | "suspicious"
    | "annoyed"
    | "happy"
    | "celebrating"
    | "sleeping"
    | "shocked"
    | "thinking"

  message?: string

  intensity: number
}
```

Do not parse free-form LLM prose to determine application behavior if structured output can do the job.

---

# 19. Do not over-agent v1

The organism is an agent in the loose sense that it observes context, reasons about it and acts.

It does not need a complex autonomous agent loop.

Initial loop:

```text
observe
  ↓
aggregate
  ↓
detect meaningful situation
  ↓
AI interpretation
  ↓
action
  ↓
cooldown
```

Later:

```text
observe
  ↓
remember
  ↓
form hypotheses
  ↓
monitor
  ↓
act
  ↓
update memory
```

That second system is where the "personal AI organism" idea can become substantially deeper.

It does not belong in the first prototype.

---

# 20. Privacy architecture

This product touches potentially sensitive browser activity.

Default principle:

> **Collect as little as possible.**

For v1:

* store behavioral events locally where possible
* do not send raw page contents to a server
* do not record screenshots
* do not record keystrokes
* do not capture passwords or form inputs
* make external AI processing explicit
* allow the user to clear stored history
* minimize extension permissions

If AI calls require external processing, send only the minimum context required.

The architecture should remain self-hostable.

This is also a potential trust advantage if the project becomes open source.

---

# 21. Open source / self-hosting

Recommended initial position:

## Open source the core

Open source:

* extension
* browser observation layer
* event model
* organism renderer
* sprite system
* state machine
* local storage
* basic AI integration
* self-hosting instructions

Potentially keep hosted services proprietary later:

* hosted inference
* sync
* cloud memory
* advanced personalization
* managed hosting
* character marketplace

Do not make the monetization decision the center of v1.

The important thing is that users can inspect what the extension is doing.

For a product with browser access, transparency can itself be part of the product.

---

# 22. Monetization

Do not charge immediately.

First objective:

> **Get people to install it and keep it installed.**

If users actually like the organism, possible future monetization includes:

### Free

* one character
* local memory
* basic reactions
* goal tracking
* self-hosted/local AI

### Paid

* multiple characters
* better hosted models
* persistent cross-device memory
* advanced personalization
* character packs
* cloud sync
* long-term behavioral insights
* custom characters
* managed hosting

A possible future experiment:

```text
Free
$0

Personal
$5-8/month

Annual
$30-50/year
```

These are placeholders, not validated pricing.

Do not spend time designing pricing until there is evidence that people care.

---

# 23. Distribution

The visual mechanic is the distribution.

The extension should create screenshots and videos that people naturally want to share.

Examples:

> "My Chrome extension just called me out."

> "This thing watches me work."

> "I installed a little creature in my browser and it has opinions."

> "My browser pet caught me opening Reddit."

The character itself can become the recognizable identity of the project.

Potential channels:

* Chrome Web Store
* Reddit
* X
* TikTok
* YouTube Shorts
* GitHub
* Product Hunt
* character packs
* community-created characters

The product should be understandable from a five-second video.

---

# 24. V1 scope

Do not build the grand vision.

Build this:

## Organism v0.1

1. WXT Chrome extension.
2. One character.
3. One sprite sheet.
4. Character rendered in a fixed overlay.
5. Idle animation.
6. Walking animation.
7. Basic browser event observer.
8. Detect tab switching.
9. Detect current domain.
10. Track time on current domain.
11. Basic goal input.
12. Detect obvious divergence from the goal.
13. Character reacts.
14. AI generates occasional short remarks.
15. Local state.
16. No account.
17. No backend unless required for AI.
18. No analytics initially.

Demo:

```text
User:
"Work on project"

        ↓

Chrome

        ↓

GitHub

        ↓

Chrome documentation

        ↓

Local development

        ↓

Reddit

        ↓

Detected divergence

        ↓

Character walks into screen

        ↓

"Interesting."

        ↓

User returns to GitHub

        ↓

Character walks away

        ↓

User continues working

        ↓

Character celebrates
```

If this feels good, we have something worth developing.

---

# 25. V1.1

Only after the basic organism works:

* multiple characters
* personality configuration
* more animations
* better behavioral heuristics
* character-specific prompts
* speech bubbles
* character settings
* local event history
* configurable interruption frequency
* custom goals

---

# 26. V2

Only after usage validates the concept:

* persistent memory
* daily summaries
* "what were you doing today?"
* behavioral patterns
* recurring interests
* unfinished threads
* long-term character relationship
* detective-board visualization
* user-defined goals
* richer autonomous behavior

The detective board is a strong future representation of accumulated memory, but it should not delay the first experiment.

---

# 27. Technical questions for the implementation agent

Before coding, investigate:

1. Exact WXT project structure.
2. How to isolate the organism from hostile webpage CSS.
3. Whether Shadow DOM should be used for the overlay.
4. DOM/CSS sprite animation vs Canvas for v1.
5. How sprite sheets should be normalized.
6. How animation states should map to sprite frames.
7. How browser events should be aggregated before AI calls.
8. Where AI calls should happen.
9. How service worker and content scripts should communicate.
10. The minimum permissions actually required.
11. Which pages Chrome prevents content scripts from accessing.
12. How local state should be persisted.
13. How data retention/deletion should work.
14. How AI credentials should be handled securely.
15. How the AI layer can remain self-hostable.
16. How to prevent the organism from becoming annoying.
17. How to test the organism across different websites.
18. How to package sprite/character assets cleanly.
19. Whether Canvas materially improves v1 over DOM/CSS.
20. What the smallest possible demo is that feels alive.

Do not solve future architecture problems prematurely.

---

# 28. Core design constraint

The organism should feel alive without becoming annoying.

Therefore:

**Presence > notifications**

**Personality > productivity metrics**

**Observation > interruption**

**Short remarks > essays**

**Behavior > dashboards**

**Memory later > complexity now**

The first thing being tested is not whether an LLM can classify browsing behavior.

It obviously can.

The experiment is whether a user enjoys having a tiny intelligent creature living alongside them while they use the browser.

If that works, the rest can evolve naturally.

---

# 29. The simplest possible definition

If everything above gets stripped away, the product is:

> **A little AI creature that lives in your browser, watches what you do, and has opinions about it.**

Build that first.
