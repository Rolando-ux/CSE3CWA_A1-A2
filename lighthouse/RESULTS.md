# Lighthouse results

Lighthouse 13.5.0, run on a production build served on a throwaway database, using Playwright's Chromium. Scores are out of 100. "before" ran 2026-10-06; "after" ran 2026-10-06. Lighthouse scores vary slightly between runs, especially performance.

## Accessibility

| Page | Mobile (before → after) | Desktop (before → after) |
|---|---:|---:|
| Home (/) | 100 | 100 |
| /wordle | 100 | 100 |
| /word-search | 100 | 100 |
| /dashboard | 100 | 100 |
| /about | 100 | 100 |
| /settings | 100 | 100 |

## Performance

| Page | Mobile (before → after) | Desktop (before → after) |
|---|---:|---:|
| Home (/) | 99 → **97** | 100 |
| /wordle | 97 → **99** | 100 |
| /word-search | 97 → **99** | 100 |
| /dashboard | 95 → **97** | 77 → **100** |
| /about | 97 | 100 |
| /settings | 97 → **99** | 100 |

## Best practices

| Page | Mobile (before → after) | Desktop (before → after) |
|---|---:|---:|
| Home (/) | 100 | 100 |
| /wordle | 100 | 100 |
| /word-search | 100 | 100 |
| /dashboard | 100 | 100 |
| /about | 96 | 96 |
| /settings | 100 | 100 |

## SEO

| Page | Mobile (before → after) | Desktop (before → after) |
|---|---:|---:|
| Home (/) | 100 | 100 |
| /wordle | 100 | 100 |
| /word-search | 100 | 100 |
| /dashboard | 100 | 100 |
| /about | 100 | 100 |
| /settings | 100 | 100 |

## Layout stability (Cumulative Layout Shift, lower is better; under 0.1 is good)

| Page | Mobile (before → after) | Desktop (before → after) |
|---|---:|---:|
| Home (/) | 0 | 0 |
| /wordle | 0.089 → **0** | 0.029 → **0** |
| /word-search | 0.089 → **0** | 0.024 → **0** |
| /dashboard | 0.089 → **0** | 0.738 → **0** |
| /about | 0 | 0 |
| /settings | 0 | 0 |

## What the accessibility fixes were worth

These pages were also run with the accessibility fixes temporarily removed (everything else unchanged), then compared with the "after" run. The fixes were made after an automated axe-core scan, the same engine behind Lighthouse's accessibility score.

| Page | Mode | Accessibility without the fixes → with | Audits that failed without the fixes |
|---|---|---:|---|
| /wordle | mobile | 98 → **100** | Heading elements are not in a sequentially-descending order (`heading-order`: section.w-full > div.flex > div > h3.mb-2) |
| /wordle | desktop | 98 → **100** | Heading elements are not in a sequentially-descending order (`heading-order`: section.w-full > div.flex > div > h3.mb-2) |
| /word-search | mobile | 96 → **100** | Background and foreground colors do not have a sufficient contrast ratio. (`color-contrast`: div.mt-8 > div.flex > section.flex > div.flex) |
| /word-search | desktop | 96 → **100** | Background and foreground colors do not have a sufficient contrast ratio. (`color-contrast`: div.mt-8 > div.flex > section.flex > div.flex) |
| /dashboard | mobile | 100 | none |
| /dashboard | desktop | 100 | none |

## Audits still failing in "after"

- **/about (mobile)**: Browser errors were logged to the console (`errors-in-console`, best-practices)
- **/about (desktop)**: Browser errors were logged to the console (`errors-in-console`, best-practices)
