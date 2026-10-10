// One budget per webhook, independent of hosting-provider execution limits.
// Cancellation cannot undo a remote write; keep uncertain D1 reservations intact.
export class BookingDeadlineError extends Error {
  constructor() {
    super("booking processing deadline exceeded")
    this.name = "BookingDeadlineError"
  }
}

export class BookingBodyTooLargeError extends Error {}

export class BookingDeadline {
  readonly signal: AbortSignal
  private readonly controller = new AbortController()
  private readonly expiresAt: number
  private readonly now: () => number
  private readonly timer: ReturnType<typeof setTimeout>
  private readonly parent?: AbortSignal
  private readonly onParentAbort = () => this.controller.abort(new BookingDeadlineError())

  constructor(options: { timeoutMs?: number; now?: () => number; signal?: AbortSignal } = {}) {
    const timeoutMs = options.timeoutMs ?? 25_000
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new RangeError("invalid booking budget")
    this.now = options.now ?? (() => performance.now())
    this.expiresAt = this.now() + timeoutMs
    this.signal = this.controller.signal
    this.parent = options.signal
    this.timer = setTimeout(() => this.controller.abort(new BookingDeadlineError()), timeoutMs)
    this.parent?.addEventListener("abort", this.onParentAbort, { once: true })
    if (this.parent?.aborted) this.onParentAbort()
  }

  check() {
    // The monotonic check also protects against delayed timers/event-loop stalls.
    if (this.now() >= this.expiresAt && !this.signal.aborted) {
      this.controller.abort(new BookingDeadlineError())
    }
    if (this.signal.aborted) throw new BookingDeadlineError()
  }

  async wait<T>(operation: () => Promise<T>): Promise<T> {
    this.check()
    let onAbort = () => {}
    try {
      const result = await new Promise<T>((resolve, reject) => {
        onAbort = () => reject(new BookingDeadlineError())
        this.signal.addEventListener("abort", onAbort, { once: true })
        if (this.signal.aborted) return onAbort()
        // Both handlers remain attached if cancellation wins, consuming late rejection.
        Promise.resolve().then(() => { this.check(); return operation() }).then(resolve, reject)
      })
      this.check()
      return result
    } finally {
      this.signal.removeEventListener("abort", onAbort)
    }
  }

  fetch(input: string | URL, init: RequestInit = {}) {
    return this.wait(() => fetch(input, { ...init, signal: this.signal }))
  }

  json<T>(response: Response): Promise<T> {
    return this.wait(() => response.json() as Promise<T>)
  }

  async delay(ms: number) {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await this.wait(() => new Promise<void>((resolve) => { timer = setTimeout(resolve, ms) }))
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  async readBody(request: Request, maxBytes: number) {
    this.check()
    const reader = request.body?.getReader()
    if (!reader) return ""
    const chunks: Uint8Array[] = []
    let size = 0
    let finished = false
    try {
      while (true) {
        const { done, value } = await this.wait(() => reader.read())
        if (done) { finished = true; break }
        size += value.byteLength
        if (size > maxBytes) throw new BookingBodyTooLargeError("request too large")
        chunks.push(value)
      }
      this.check()
      return Buffer.concat(chunks).toString("utf8")
    } finally {
      // Never await cancellation of an uncooperative/half-open inbound stream.
      if (!finished) void reader.cancel().catch(() => {})
    }
  }

  dispose() {
    clearTimeout(this.timer)
    this.parent?.removeEventListener("abort", this.onParentAbort)
    // Fence any late, uncooperative continuation after the handler has returned.
    this.controller.abort(new BookingDeadlineError())
  }
}
