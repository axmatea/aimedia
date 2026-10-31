// Offline, version-guarded scene tooling only. This is not a browser runtime
// replacement or a general-purpose MessagePack implementation. Unknown tokens,
// extension types, cyclic graphs, and unsafe object keys fail closed.

export const EXTENSION_TYPE = Symbol("spline-offline-extension-type")

const typedArrays = [
  Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array,
  Int32Array, Uint32Array, Float32Array, Float64Array, BigInt64Array, BigUint64Array,
]
const forbiddenKeys = new Set(["__proto__", "prototype", "constructor"])
const utf8 = new TextDecoder("utf-8", { fatal: true })
const pendingReference = Symbol("pending-reference")
const maxDepth = 512

export const getExtensionType = value => value !== null && typeof value === "object" ? value[EXTENSION_TYPE] : undefined

function tagged(value, type) {
  if (value === null || typeof value !== "object") throw new Error(`Extension ${type} must wrap an object`)
  Object.defineProperty(value, EXTENSION_TYPE, { value: type, enumerable: false })
  return value
}

function checkKey(key) {
  if (typeof key !== "string" || forbiddenKeys.has(key)) throw new Error(`Unsafe or unsupported map key: ${String(key)}`)
  return key
}

export function decodeScene(input) {
  if (!(input instanceof Uint8Array)) throw new TypeError("Scene must be a Buffer or Uint8Array")
  const bytes = Buffer.from(input.buffer, input.byteOffset, input.byteLength)
  let offset = 0
  let depth = 0
  const records = []
  const references = new Map()

  const requireBytes = count => {
    if (!Number.isSafeInteger(count) || count < 0 || offset + count > bytes.length) throw new Error(`Truncated scene at byte ${offset}`)
  }
  const take = count => {
    requireBytes(count)
    const value = bytes.subarray(offset, offset + count)
    offset += count
    return value
  }
  const u8 = () => { requireBytes(1); return bytes[offset++] }
  const u16 = () => { requireBytes(2); const value = bytes.readUInt16BE(offset); offset += 2; return value }
  const u32 = () => { requireBytes(4); const value = bytes.readUInt32BE(offset); offset += 4; return value }
  const string = count => utf8.decode(take(count))
  const array = count => {
    // Every item requires at least one byte. Reject huge allocation claims first.
    requireBytes(count)
    const value = new Array(count)
    for (let index = 0; index < count; index++) value[index] = read()
    return value
  }
  const map = count => {
    requireBytes(count * 2)
    const value = {}
    for (let index = 0; index < count; index++) {
      const key = checkKey(read())
      if (Object.hasOwn(value, key)) throw new Error(`Duplicate map key: ${key}`)
      value[key] = read()
    }
    return value
  }
  const readRecord = id => {
    const keys = records[id]
    if (!keys) throw new Error(`Undefined record ${id} at byte ${offset}`)
    if (keys.highByte === 0) {
      const high = u8()
      if (high !== 0) return readRecord(id < 32 ? -(id + (high << 5)) : id + (high << 5))
    }
    const value = {}
    for (const name of keys) value[checkKey(name)] = read()
    return value
  }
  const defineRecord = (id, high) => {
    const keys = read()
    if (!Array.isArray(keys) || keys.some(key => typeof key !== "string") || new Set(keys).size !== keys.length) throw new Error("Invalid record key list")
    if (high !== undefined) {
      id = id < 32 ? -((high << 5) + id) : (high << 5) + id
      keys.highByte = high
    }
    records[id] = keys
    return readRecord(id)
  }
  const extension = count => {
    const type = u8()
    const payload = take(count)
    if ([0, 1, 2, 3, 4, 5, 6].includes(type)) {
      if (count !== 1 || payload[0] !== 0) throw new Error(`Unsupported extension ${type} payload`)
      if (type === 0) return undefined
      const value = read()
      if (type === 4) return tagged({ id: value }, type)
      if (type === 5) return tagged({ data: value }, type)
      if ((type === 2 || type === 3) !== Array.isArray(value)) throw new Error(`Unexpected extension ${type} value shape`)
      if ((type === 1 || type === 6) && (value === null || typeof value !== "object" || ArrayBuffer.isView(value))) throw new Error(`Unexpected extension ${type} map shape`)
      return tagged(value, type)
    }
    if (type === 105) {
      if (count !== 4) throw new Error("Reference definition must have a four-byte ID")
      const id = payload.readUInt32BE(0)
      if (references.has(id)) throw new Error(`Duplicate reference ID ${id}`)
      references.set(id, pendingReference)
      const value = read()
      if (value === null || typeof value !== "object") throw new Error("Reference definition must wrap an object")
      references.set(id, value)
      return value
    }
    if (type === 112) {
      if (count !== 4) throw new Error("Reference alias must have a four-byte ID")
      const id = payload.readUInt32BE(0)
      if (!references.has(id)) throw new Error(`Undefined reference ID ${id}`)
      const value = references.get(id)
      if (value === pendingReference) throw new Error(`Cyclic reference ${id} is not supported`)
      return value
    }
    if (type === 116) {
      const Constructor = typedArrays[payload[0]]
      if (!Constructor || count < 1 || (count - 1) % Constructor.BYTES_PER_ELEMENT !== 0) throw new Error("Unsupported typed-array extension")
      // A fresh aligned ArrayBuffer both owns the bytes and avoids Buffer pool
      // offsets being misinterpreted by the typed-array constructor.
      return new Constructor(Uint8Array.from(payload.subarray(1)).buffer)
    }
    throw new Error(`Unsupported extension ${type} at byte ${offset - count - 1}`)
  }

  function read() {
    if (++depth > maxDepth) throw new Error("Scene nesting limit exceeded")
    try {
      const token = u8()
      if (token < 0x40) return token
      if (token < 0x80) return records[token & 0x3f] ? readRecord(token & 0x3f) : token
      if (token < 0x90) return map(token - 0x80)
      if (token < 0xa0) return array(token - 0x90)
      if (token < 0xc0) return string(token - 0xa0)
      if (token >= 0xe0) return token - 0x100
      switch (token) {
        case 0xc0: return null
        case 0xc2: return false
        case 0xc3: return true
        case 0xc4: return Buffer.from(take(u8()))
        case 0xc5: return Buffer.from(take(u16()))
        case 0xc6: return Buffer.from(take(u32()))
        case 0xc7: return extension(u8())
        case 0xc8: return extension(u16())
        case 0xc9: return extension(u32())
        case 0xca: { requireBytes(4); const value = bytes.readFloatBE(offset); offset += 4; return value }
        case 0xcb: { requireBytes(8); const value = bytes.readDoubleBE(offset); offset += 8; return value }
        case 0xcc: return u8()
        case 0xcd: return u16()
        case 0xce: return u32()
        case 0xcf: { requireBytes(8); const value = bytes.readBigUInt64BE(offset); offset += 8; return value }
        case 0xd0: { requireBytes(1); return bytes.readInt8(offset++) }
        case 0xd1: { requireBytes(2); const value = bytes.readInt16BE(offset); offset += 2; return value }
        case 0xd2: { requireBytes(4); const value = bytes.readInt32BE(offset); offset += 4; return value }
        case 0xd3: { requireBytes(8); const value = bytes.readBigInt64BE(offset); offset += 8; return value }
        case 0xd4:
          if (bytes[offset] === 114) { offset++; return defineRecord(u8() & 63) }
          return extension(1)
        case 0xd5:
          if (bytes[offset] === 114) { offset++; const id = u8() & 63; return defineRecord(id, u8()) }
          return extension(2)
        case 0xd6: return extension(4)
        case 0xd7: return extension(8)
        case 0xd8: return extension(16)
        case 0xd9: return string(u8())
        case 0xda: return string(u16())
        case 0xdb: return string(u32())
        case 0xdc: return array(u16())
        case 0xdd: return array(u32())
        case 0xde: return map(u16())
        case 0xdf: return map(u32())
        default: throw new Error(`Unsupported token 0x${token.toString(16)} at byte ${offset - 1}`)
      }
    } finally { depth-- }
  }

  const value = read()
  if (offset !== bytes.length) throw new Error(`Trailing data at byte ${offset}`)
  return value
}

export function encodeScene(value) {
  const chunks = []
  const counts = new WeakMap()
  const seen = new WeakSet()
  const active = new WeakSet()
  const references = new WeakMap()
  let nextReference = 1
  let depth = 0
  const isObject = item => item !== null && typeof item === "object"
  const content = item => {
    const extension = getExtensionType(item)
    if (extension === 4) return [item.id]
    if (extension === 5) return [item.data]
    if (Buffer.isBuffer(item) || ArrayBuffer.isView(item)) return []
    if (Array.isArray(item)) return item
    if (Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null) throw new Error("Unsupported scene object prototype")
    return Object.values(item)
  }
  function count(item, level = 0) {
    if (!isObject(item)) return
    if (level > maxDepth) throw new Error("Scene nesting limit exceeded")
    if (active.has(item)) throw new Error("Cyclic scene graph is not supported")
    counts.set(item, (counts.get(item) ?? 0) + 1)
    if (seen.has(item)) return
    seen.add(item)
    active.add(item)
    for (const child of content(item)) count(child, level + 1)
    active.delete(item)
  }
  count(value)

  const byte = token => chunks.push(Buffer.from([token]))
  const number = (token, bytes, method, item) => {
    const buffer = Buffer.alloc(1 + bytes)
    buffer[0] = token
    buffer[method](item, 1)
    chunks.push(buffer)
  }
  const length = (size, fixBase, fixLimit, token8, token16, token32) => {
    if (!Number.isSafeInteger(size) || size < 0 || size > 0xffffffff) throw new Error("Unsupported container length")
    if (fixBase !== null && size < fixLimit) byte(fixBase + size)
    else if (token8 !== null && size < 0x100) number(token8, 1, "writeUInt8", size)
    else if (size < 0x10000) number(token16, 2, "writeUInt16BE", size)
    else number(token32, 4, "writeUInt32BE", size)
  }
  const extension = (type, payload) => {
    const sizes = new Map([[1, 0xd4], [2, 0xd5], [4, 0xd6], [8, 0xd7], [16, 0xd8]])
    if (sizes.has(payload.length)) byte(sizes.get(payload.length))
    else length(payload.length, null, 0, 0xc7, 0xc8, 0xc9)
    byte(type)
    chunks.push(payload)
  }
  const reference = (type, id) => {
    const buffer = Buffer.alloc(4)
    buffer.writeUInt32BE(id)
    extension(type, buffer)
  }

  function write(item, suppressExtension = false) {
    if (++depth > maxDepth) throw new Error("Scene nesting limit exceeded")
    try {
      if (item === undefined) { extension(0, Buffer.from([0])); return }
      if (item === null) { byte(0xc0); return }
      if (typeof item === "boolean") { byte(item ? 0xc3 : 0xc2); return }
      if (typeof item === "string") {
        const encoded = Buffer.from(item)
        length(encoded.length, 0xa0, 32, 0xd9, 0xda, 0xdb)
        chunks.push(encoded)
        return
      }
      if (typeof item === "number") {
        if (Number.isInteger(item) && !Object.is(item, -0) && Number.isSafeInteger(item)) {
          // Avoid the 0x40..0x7f record namespace even in records-free output.
          if (item >= 0 && item < 0x40) byte(item)
          else if (item >= -32 && item < 0) byte(item + 0x100)
          else if (item >= 0 && item <= 0xff) number(0xcc, 1, "writeUInt8", item)
          else if (item >= 0 && item <= 0xffff) number(0xcd, 2, "writeUInt16BE", item)
          else if (item >= 0 && item <= 0xffffffff) number(0xce, 4, "writeUInt32BE", item)
          else if (item >= -0x80 && item < 0) number(0xd0, 1, "writeInt8", item)
          else if (item >= -0x8000 && item < 0) number(0xd1, 2, "writeInt16BE", item)
          else if (item >= -0x80000000 && item < 0) number(0xd2, 4, "writeInt32BE", item)
          else number(0xcb, 8, "writeDoubleBE", item)
        } else number(0xcb, 8, "writeDoubleBE", item)
        return
      }
      if (typeof item === "bigint") {
        if (item >= 0n && item <= 0xffffffffffffffffn) number(0xcf, 8, "writeBigUInt64BE", item)
        else if (item >= -0x8000000000000000n && item < 0n) number(0xd3, 8, "writeBigInt64BE", item)
        else throw new Error("BigInt is outside MessagePack int64 range")
        return
      }
      if (!isObject(item)) throw new Error(`Unsupported value type: ${typeof item}`)
      if (!suppressExtension && counts.get(item) > 1) {
        const existing = references.get(item)
        if (existing !== undefined) { reference(112, existing); return }
        const id = nextReference++
        references.set(item, id)
        reference(105, id)
      }
      const type = suppressExtension ? undefined : getExtensionType(item)
      if (type !== undefined) {
        if (![1, 2, 3, 4, 5, 6].includes(type)) throw new Error(`Unsupported extension ${type}`)
        extension(type, Buffer.from([0]))
        if (type === 4) write(item.id)
        else if (type === 5) write(item.data)
        else {
          if ((type === 2 || type === 3) !== Array.isArray(item)) throw new Error(`Unexpected extension ${type} value shape`)
          if ((type === 1 || type === 6) && ArrayBuffer.isView(item)) throw new Error(`Unexpected extension ${type} map shape`)
          write(item, true)
        }
        return
      }
      if (Buffer.isBuffer(item)) {
        length(item.length, null, 0, 0xc4, 0xc5, 0xc6)
        chunks.push(item)
        return
      }
      if (ArrayBuffer.isView(item)) {
        const id = typedArrays.findIndex(Constructor => item.constructor === Constructor)
        if (id < 0) throw new Error("Unsupported typed array")
        const payload = Buffer.concat([Buffer.from([id]), Buffer.from(item.buffer, item.byteOffset, item.byteLength)])
        extension(116, payload)
        return
      }
      if (Array.isArray(item)) {
        length(item.length, 0x90, 16, null, 0xdc, 0xdd)
        for (const child of item) write(child)
        return
      }
      const entries = Object.entries(item)
      // Spline's pinned native decoder does not treat ordinary MessagePack
      // maps as JavaScript objects. Emit a self-contained record definition
      // instead. Each definition owns its captured keys, so nested objects may
      // safely redefine record 0 without emitting any record references.
      chunks.push(Buffer.from([0xd4, 0x72, 0x40]))
      length(entries.length, 0x90, 16, null, 0xdc, 0xdd)
      for (const [key] of entries) write(checkKey(key))
      for (const [, child] of entries) write(child)
    } finally { depth-- }
  }
  write(value)
  return Buffer.concat(chunks)
}
