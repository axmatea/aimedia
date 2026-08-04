/**
 * Canonical AX Media mark.
 *
 * The source is the prepared transparent brand asset from
 * `../design-system/assets/logo-clean.png`, trimmed without redrawing or
 * changing its geometry. That keeps the tapered red strike deliberate and
 * identical in the header and footer.
 */
export function AxWordmark({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="AX Media"
      className={`ax-wordmark ${className ?? ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/ax-logo-clean.png" alt="" aria-hidden draggable={false} />
    </span>
  )
}
