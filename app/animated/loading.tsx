import { AxWordmark } from "@/components/ui/ax-wordmark"

import styles from "./loading.module.css"

export default function AnimatedLoading() {
  return (
    <main className={styles.shell} aria-busy="true">
      <AxWordmark className={styles.wordmark} />
      <div className={styles.status} role="status">
        <span />
        Preparing animated experience
      </div>
    </main>
  )
}
