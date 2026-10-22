import { CINEMA } from "./config"

/**
 * Import from /animated's server page only. React 19 hoists these art-directed
 * links into the head without adding client JS or preloading the frame film.
 */
export function CinematicPosterHints() {
  return <>
    <link rel="preload" as="image" type="image/webp" href={`${CINEMA.root}/entity-mobile.webp`} media="(max-width: 767px)" fetchPriority="high" />
    <link rel="preload" as="image" type="image/webp" href={`${CINEMA.root}/entity.webp`} media="(width > 767px)" fetchPriority="high" />
  </>
}
