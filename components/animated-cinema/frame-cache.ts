type Bitmap = { width: number; height: number; close: () => void }
type Options<T extends Bitmap> = {
  frameCount: number
  width: number
  height: number
  mobile: boolean
  load: (index: number, signal: AbortSignal) => Promise<Blob>
  decode: (blob: Blob) => Promise<T>
  onChange: () => void
}

/** Current and next 24-frame chunks only. No whole-film Blob or bitmap cache. */
export class CinemaFrameCache<T extends Bitmap> {
  private readonly blobs = new Map<number, Blob>()
  private readonly decoded = new Map<number, T>()
  private readonly fetching = new Map<number, AbortController>()
  private readonly decoding = new Set<number>()
  private readonly failed = new Set<number>()
  private readonly attempts = new Map<number, number>()
  private desired: number[] = []
  private center = 0
  private active = true
  private disposed = false
  readonly budget: number
  readonly limit: number
  readonly chunkSize = 24

  constructor(private readonly options: Options<T>) {
    this.budget = (options.mobile ? 48 : 64) * 1024 * 1024
    const surfaceBytes = options.width * options.height * 4
    // Include up to two concurrently decoding surfaces in the hard bound.
    this.limit = Math.min(options.mobile ? 32 : 16, Math.max(2, Math.floor(this.budget / surfaceBytes) - 2))
  }

  request(position: number, direction = 1) {
    this.center = Math.max(0, Math.min(this.options.frameCount - 1, position))
    const anchor = direction < 0 ? Math.ceil(this.center) : Math.floor(this.center)
    const chunk = Math.floor(anchor / this.chunkSize)
    const adjacent = chunk + (direction < 0 ? -1 : 1)
    const lower = Math.floor(this.center), upper = Math.ceil(this.center)
    const wanted = new Set<number>([lower, upper])
    for (const selected of [chunk, adjacent]) {
      for (let offset = 0; offset < this.chunkSize; offset++) {
        const index = selected * this.chunkSize + offset
        if (index >= 0 && index < this.options.frameCount) wanted.add(index)
      }
    }
    this.desired = [...wanted].sort((a, b) => {
      const score = (index: number) => index === lower ? -2 : index === upper ? -1 : Math.abs(index - this.center) + ((index - this.center) * direction < 0 ? 0.4 : 0)
      return score(a) - score(b)
    })
    for (const index of this.blobs.keys()) if (!wanted.has(index)) this.blobs.delete(index)
    for (const [index, controller] of this.fetching) if (!wanted.has(index)) controller.abort()
    for (const index of this.decoded.keys()) if (!wanted.has(index)) this.release(index)
    this.pump()
  }

  setActive(active: boolean) {
    this.active = active
    if (!active) for (const controller of this.fetching.values()) controller.abort()
    else this.pump()
  }

  private release(index: number) {
    this.decoded.get(index)?.close()
    this.decoded.delete(index)
  }

  private evict(needed: number) {
    const keep = new Set([Math.floor(this.center), Math.ceil(this.center)])
    const order = [...this.decoded.keys()].filter(index => !keep.has(index)).sort((a, b) => Math.abs(b - this.center) - Math.abs(a - this.center))
    while (this.decoded.size + this.decoding.size + needed > this.limit + 2 && order.length) this.release(order.shift()!)
    while (this.decoded.size > this.limit && order.length) this.release(order.shift()!)
  }

  private pump() {
    if (!this.active || this.disposed) return
    const decodeTargets = this.desired.slice(0, this.limit)
    for (const index of decodeTargets) {
      if (this.decoding.size >= 2) break
      const blob = this.blobs.get(index)
      if (!blob || this.decoded.has(index) || this.decoding.has(index) || this.failed.has(index)) continue
      this.evict(1)
      if (this.decoded.size + this.decoding.size >= this.limit + 2) break
      this.decoding.add(index)
      this.options.decode(blob).then(bitmap => {
        this.decoding.delete(index)
        if (this.disposed || !this.desired.slice(0, this.limit).includes(index)) { bitmap.close(); return }
        // The decoder must not silently return an unbounded master-resolution surface.
        if (bitmap.width * bitmap.height > this.options.width * this.options.height) {
          bitmap.close()
          this.failed.add(index)
          this.options.onChange()
          return
        }
        this.decoded.set(index, bitmap)
        this.evict(0)
        this.options.onChange()
      }).catch(() => {
        if (!this.disposed) { this.failed.add(index); this.options.onChange() }
      }).finally(() => { this.decoding.delete(index); this.pump() })
    }
    for (const index of this.desired) {
      if (this.fetching.size >= 4) break
      if (this.blobs.has(index) || this.fetching.has(index) || this.failed.has(index)) continue
      const controller = new AbortController()
      this.fetching.set(index, controller)
      this.options.load(index, controller.signal).then(blob => {
        if (!this.disposed && this.desired.includes(index) && !controller.signal.aborted) this.blobs.set(index, blob)
      }).catch(() => {
        if (this.disposed || controller.signal.aborted) return
        const attempts = (this.attempts.get(index) ?? 0) + 1
        this.attempts.set(index, attempts)
        if (attempts >= 2) this.failed.add(index)
        this.options.onChange()
      }).finally(() => { this.fetching.delete(index); this.pump() })
    }
  }

  /** Exact adjacent frames only. No nearest-frame flash on replay or reversal. */
  get(position: number) {
    const bounded = Math.max(0, Math.min(this.options.frameCount - 1, position))
    const from = this.decoded.get(Math.floor(bounded)), to = this.decoded.get(Math.ceil(bounded))
    return from && to ? { from, to, blend: bounded - Math.floor(bounded), position: bounded } : null
  }

  failedAt(position: number) { return this.failed.has(Math.floor(position)) || this.failed.has(Math.ceil(position)) }

  get stats() {
    const bytes = [...this.decoded.values()].reduce((total, bitmap) => total + bitmap.width * bitmap.height * 4, 0)
    return { decoded: this.decoded.size, decodedBytes: bytes, reservedBytes: this.decoding.size * this.options.width * this.options.height * 4, compressed: this.blobs.size, fetching: this.fetching.size, decoding: this.decoding.size, failed: this.failed.size }
  }

  dispose() {
    this.disposed = true
    for (const controller of this.fetching.values()) controller.abort()
    for (const index of this.decoded.keys()) this.release(index)
    this.blobs.clear()
    this.desired = []
  }
}
