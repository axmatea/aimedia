import type { Resend } from "resend"

export type CancelResult = {
  id: string
  ok: boolean
  error?: string
}

/**
 * Cancel a list of scheduled Resend emails. Each id is independent,
 * a single failure does not abort the rest. Returns one entry per id.
 */
export async function cancelScheduled(
  resend: Resend,
  ids: string[]
): Promise<CancelResult[]> {
  const results: CancelResult[] = []
  for (const id of ids) {
    try {
      const r = await resend.emails.cancel(id)
      if (r.error) {
        results.push({ id, ok: false, error: r.error.message || JSON.stringify(r.error) })
      } else {
        results.push({ id, ok: true })
      }
    } catch (err) {
      results.push({ id, ok: false, error: err instanceof Error ? err.message : String(err) })
    }
  }
  return results
}
