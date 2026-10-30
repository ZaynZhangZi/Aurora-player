export class ExpiringCache extends Map {
  constructor({max = 128, ttl = 300000, now = Date.now} = {}) {
    super()
    this.max = max
    this.ttl = ttl
    this.now = now
    this.deadlines = new Map()
  }
  set(key, value, ttl = this.ttl) {
    const seconds = Number(value?.entry?.expi)
    if (Number.isFinite(seconds) && seconds > 0) ttl = Math.min(ttl, seconds * 1000 - Math.min(5000, seconds * 100))
    super.delete(key)
    super.set(key, value)
    this.deadlines.set(key, this.now() + Math.max(1, ttl))
    while (super.size > this.max) this.delete(super.keys().next().value)
    return this
  }
  get(key) {
    if ((this.deadlines.get(key) ?? 0) <= this.now()) { this.delete(key); return undefined }
    const value = super.get(key)
    if (super.has(key)) { super.delete(key); super.set(key, value) }
    return value
  }
  has(key) { return this.get(key) !== undefined }
  delete(key) { this.deadlines.delete(key); return super.delete(key) }
  clear() { this.deadlines.clear(); super.clear() }
  prune() { for (const key of super.keys()) if ((this.deadlines.get(key) ?? 0) <= this.now()) this.delete(key) }
  keys() { this.prune(); return super.keys() }
  values() { this.prune(); return super.values() }
}
