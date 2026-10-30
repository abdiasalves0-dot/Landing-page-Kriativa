# Marquee

A full-width strip of service names scrolling sideways on `bg2`, between hairlines.

- Items are 12px uppercase, tracked 0.2em, in `muted`, separated by 4px dots in `white-border`.
- The consumer provides the list; repeat it twice inside `.marquee-inner` so the 18s `translateX(-50%)` loop is seamless. It stops under reduced motion.
