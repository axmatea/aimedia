/**
 * Canonical AX Media mark.
 *
 * The source is the prepared transparent brand asset from
 * `../design-system/assets/logo-clean.png`, trimmed without redrawing or
 * changing its geometry. Its losslessly encoded 512px delivery copy keeps the
 * tapered red strike identical in the header and footer without a full-size PNG.
 */
export function AxWordmark({ className }: { className?: string }) {
  return (
    <>
      <link rel="preload" as="image" href="/brand/ax-wordmark-512-v1.webp" type="image/webp" fetchPriority="high" />
      <span
        role="img"
        aria-label="AX Media"
        className={`ax-wordmark ${className ?? ""}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/ax-wordmark-512-v1.webp" width={1022} height={549} alt="" aria-hidden draggable={false} decoding="async" fetchPriority="high" />
      </span>
    </>
  )
}
