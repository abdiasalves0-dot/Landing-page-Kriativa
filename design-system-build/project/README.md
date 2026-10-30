Kriativa is a design studio and software house from Brasília — "Do conceito visual ao sistema inteligente." The identity is dark, monochrome and editorial: cream type on near-black, heavy uppercase sans set against an italic serif, square grids cut by 1px hairlines, and pill-shaped actions. There is no brand hue; restraint is the brand.

## Content fundamentals

- **Language:** Brazilian Portuguese. Keep accents (`Serviços`, `Estratégia`, `Canaã`).
- **Voice (from the brand manual):** direct and confident, technical when needed, elegant, visionary with feet on the ground. Never generic or pushy, never over-casual, never over-promising, never cold.
- **Person:** speak as *we* to *you* — "Criamos experiências digitais…", "Conte seu projeto."
- **Headline pattern:** a two-part line. The first half is uppercase Inter Black (`display-hero`, `heading-section`); the second half breaks to its own line in Playfair Display italic, sentence case, in `white-dim` (`serif-hero`, `serif-section`).
  - "DESIGN QUE TRANSFORMA." / *Criatividade sem limites.*
  - "SOMOS UM ESTÚDIO" / *focado em resultado.*
  - "PRONTO PARA" / *transformar sua marca?*
- **Eyebrows** sit in square brackets, uppercase, widely tracked: `[ Quem somos ]`, `[ Vamos trabalhar juntos ]`.
- **Numbering** is two-digit and quiet: `01`–`06` on services, `01`–`04` on process steps; counts read "06 especialidades".
- **Calls to action** are short verbs: "Ver portfólio", "Iniciar projeto →", "Falar com a gente", "Ver mais telas".
- **No emoji.** Typographic glyphs only: `→`, `↓`, `✓`, `✕`.

## Visual foundations

### Colour

- Ground every page on `bg`. Alternate bands (marquee, stats, process) use `bg2`; media wells and image placeholders use `bg3`.
- Set primary text and headlines in `white` (Branco Creme #f2f0eb). `accent` is an alias of `white` — use it for underlines, the scroll bar and stat bars.
- Body copy and the italic half of headlines use `white-dim` (≈5.6:1 on `bg`).
- `muted` (≈3:1 on `bg`) is for small labels only — eyebrows, numbering, captions. It is below 4.5:1, so never put copy someone must read in it; use `white-dim` instead.
- Every rule and outline is `white-border` at `hairline` (1px). Translucent fills (tags, the hero badge) use `white-subtle`.
- `status-live` (#4ade80) is the only non-neutral colour: the pulsing "available" dot. Never use it for text or fills.
- Brand documents and print (manual, signatures, cards) use the manual's scale: `black-deep` → `black` → `graphite-dark` → `graphite` → `graphite-mid` → `graphite-light`, with `silver-dark`, `silver`, `silver-light` for auxiliary text. The institutional gradient runs `black-deep` → `graphite-light` at 135°.
- Do not place the logo or text on coloured backgrounds; the brand manual forbids it.

### Typography

- Two families, both from Google Fonts: **Inter** (`sans`, weights 300/400/500/700/900) for everything, and **Playfair Display** 700 italic (`serif`) only for the second half of headlines.
- Display styles (`display-hero`, `display-cta`, `heading-section`, `stat-number`) are Inter 900, UPPERCASE, tight leading (0.9–1.0) and negative tracking (−0.03 to −0.04em). On the site they are fluid with `clamp()`; the token is the maximum size.
- Body is light: `body-lg` (16px, 300, 1.8) and `body` (14px, 300, 1.7).
- Labels (`eyebrow`, `nav-link`, `stat-label`, `index-number`, `tag`) are small, uppercase and widely tracked (0.05–0.35em).

### Spacing and layout

- Content sits in a `container-max` (1200px) column with a `space-60` gutter on desktop and `space-24` under 900px.
- Sections breathe: `space-140` top and bottom (`space-80` on mobile); the CTA gets `space-160`.
- Two-column sections split 1fr 1fr with a `space-80` gap and collapse to one column under 900px.
- Grids of cards are drawn with a 1px gap over `white-border` so the lines between cells are hairlines, not borders on each card.
- The hero carries a faint background grid at `grid-pitch` (80px) in `white` at 3% opacity, plus a soft radial glow at 4%.

### Shape, borders and depth

- Square by default (`radius-none`) for cards, grids and sections.
- `radius-pill` on every button and tag; `radius-lg` (16px) for floating badges and screenshot frames; `radius-xl` for the lightbox.
- Depth comes from tone (`bg` → `bg2` → `bg3`) and hairlines, not shadows. Shadows appear only on interaction: `shadow-glow` on primary-button hover, `shadow-lift` on image hover, `shadow-modal` on the lightbox.

### Motion

- Easing is `cubic-bezier(0.16, 1, 0.3, 1)` for movement; colour and opacity changes take 0.25s.
- Entrances fade up 20–24px over 0.7–0.8s, staggered by 0.15s down the hero.
- Hovers: buttons scale to 1.02–1.03; service cards draw a 2px `white` underline from the left; arrows nudge 3–4px right.
- The marquee scrolls in 18s loops. All motion stops under `prefers-reduced-motion`.

### States

- Links and nav: `white-dim` at rest, `white` on hover.
- Cards: `bg` at rest, `bg2` on hover.
- Outline buttons: `white-border` at rest, 60% cream border plus `white-subtle` fill on hover.
- Focus: the site defines no focus style. Use a 2px solid `white` outline at 2px offset (16:1 on `bg`).

## Iconography

- Service icons are 28×28 line drawings: 1.5px strokes in `white`, no fill, round caps, built from simple geometric primitives (squares, circles, straight lines). Six exist (see Icons): Identidade Visual, Web Design, Software & Web, UI & UX Design, Motion Design, Estratégia de Marca. Show them at 70% opacity.
- New icons follow the same grid: 28px box, 2px inset, 1.5px stroke, geometric primitives only.
- Arrows and checks are text glyphs (`→`, `↓`, `✓`) sitting in 32px or 16px hairline circles.

## Logo

- The mark is the geometric "K" symbol plus the lowercase "kriativa" wordmark (`kriativa-logo.svg`, white). Use them together or apart.
- Preferred: white on a dark ground. Allowed: black on light (`k-symbol-black.png`), the symbol alone at small sizes, the full wordmark for horizontal layouts.
- Clear space: 1x on every side, where 1x is half the height of the K symbol.
- Never distort, rotate, lower the opacity, recolour, add effects to, or place the logo on a coloured ground.
