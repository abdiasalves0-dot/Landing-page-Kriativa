# Button

Pill-shaped actions in four variants: primary (cream fill), ghost (text + arrow circle), outline (hairline pill) and the compact nav CTA.

- **Primary** `.btn-primary`: the one main action per view ("Ver portfólio", "Iniciar projeto agora"). `white` fill, `bg` text, `radius-pill`, 14px/32px padding. Hover scales to 1.03 and adds `shadow-glow`.
- **Ghost** `.btn-ghost` + `.btn-ghost-arrow`: the secondary action beside a primary. `white-dim` text with a 32px hairline circle holding `→`; the arrow nudges 3px on hover.
- **Outline** `.btn-outline`: uppercase, tracked 0.08em, hairline `white-border`; for reveal/expand actions ("Ver mais telas ↓"). Rotate the arrow 180° when expanded.
- **Nav CTA** `.nav-cta`: 13px, 10px/24px padding, only in the navigation bar.

The consumer provides the label (sentence case, a short verb phrase) and an `href` or click handler. Never put two primary buttons side by side; pair a primary with a ghost.
