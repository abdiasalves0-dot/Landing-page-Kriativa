# ProcessStep

One row of the process list: number, uppercase title, description and a trailing arrow, separated by hairlines.

- A grid of 80px / 1fr / 1fr with a 40px gap and 40px vertical padding; under 900px it becomes 40px / 1fr with the description under the title.
- Number `index-number`, title `heading-step`, description `body` at 1.8 leading in `muted`; the arrow turns `white` and nudges 4px on hover.
- The consumer provides the steps in order (the site uses four: Descoberta, Estratégia, Criação, Entrega).
