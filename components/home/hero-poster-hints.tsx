/**
 * Homepage-only server markup. React 19 hoists these links into the head.
 * Native media predicates preserve the picture's art direction; ReactDOM's
 * preload API does not accept media. Ranges avoid overlap at fractional widths.
 * Browsers without range-query support still discover the unchanged eager img.
 */
export function HeroPosterHints() {
  return (
    <>
      <link rel="preload" as="image" type="image/webp" href="/hero/robot-poster-mobile.webp" media="(max-width: 520px)" fetchPriority="high" />
      <link rel="preload" as="image" type="image/webp" href="/hero/robot-poster-tablet.webp" media="(width > 520px) and (width <= 1023px)" fetchPriority="high" />
      <link rel="preload" as="image" type="image/webp" href="/hero/robot-poster-desktop.webp" media="(width > 1023px)" fetchPriority="high" />
    </>
  )
}
