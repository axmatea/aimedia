import { AxWordmark } from "@/components/ui/ax-wordmark"

import styles from "./animated-experience.module.css"

export default function AnimatedLoading() {
  return (
    <main className={styles.initialShell} aria-busy="true">
      <AxWordmark className={styles.loadingWordmark} />
      <div className={styles.initialStatus} role="status">
        <span />
        Preparing animated experience
      </div>
    </main>
  )
}
