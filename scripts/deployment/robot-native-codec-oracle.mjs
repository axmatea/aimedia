// Offline validation ONLY. Execute the exact installed native unpacker, not a
// second interpretation of MessagePack. No Application, DOM, scene rendering,
// network, or altered browser runtime is involved.
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import vm from "node:vm"
import { EXTENSION_TYPE } from "./robot-scene-codec.mjs"

const runtime = readFileSync(new URL(import.meta.resolve("@splinetool/runtime")))
assert.equal(createHash("sha256").update(runtime).digest("hex"), "b640ca5e0d3930489580f8ed6c3a7757b60767f6b6ce9768ed8df6a0f5709348", "Native codec changed; review the oracle extraction")
const source = runtime.toString("utf8")
const start = source.indexOf("var yA;try{yA=new TextDecoder")
const end = source.indexOf("var v0;try{v0=new TextEncoder", start)
assert.equal(start, 593511)
assert.equal(end, 604548)

const context = vm.createContext({ Buffer, TextDecoder, TextEncoder, extensionType: EXTENSION_TYPE })
vm.runInContext(`
const global = globalThis;
${source.slice(start, end)}
class ObjectMap {}
class List extends Array {}
class Tree extends Array {}
class LayerMap {}
class AssetReference { constructor(id) { this.id = id; } }
class BlobReference { constructor(data) { this.data = data; } }
// These read bodies match the native registrations following the codec. Only
// their inert prototypes differ: scene behavior is not executed in this oracle.
for (const [type, Constructor] of [[1,ObjectMap],[2,List],[3,Tree],[6,LayerMap]]) {
  Object.defineProperty(Constructor.prototype, extensionType, { value: type });
  JD({ type, read(value) { return Object.setPrototypeOf(value, Constructor.prototype), value; } });
}
Object.defineProperty(AssetReference.prototype, extensionType, { value: 4 });
Object.defineProperty(BlobReference.prototype, extensionType, { value: 5 });
JD({ type: 4, read(value) { return new AssetReference(value); } });
JD({ type: 5, read(value) { return new BlobReference(value); } });
// Native sO is a Packr/Unpackr configured with structuredClone:true. In
// particular it does NOT enable mapsAsObjects; ordinary maps decode to Map.
const unpacker = new Ro({ structuredClone: true });
globalThis.decode = bytes => unpacker.unpack(bytes);
`, context, { filename: "pinned-spline-native-codec.js", timeout: 10000 })

export const decodeNativeScene = buffer => context.decode(buffer)

export function normalizeNativeScene(value, seen = new Map()) {
  if (value === null || typeof value !== "object") return value
  // Native extension readers replace prototypes. A Map wrapped by ext 1/6 can
  // consequently report [object Object] while retaining hidden [[MapData]] and
  // losing its enumerable scene fields. Test the intrinsic slot, not its tag.
  let hasMapSlots = false
  try { Map.prototype.has.call(value, undefined); hasMapSlots = true } catch { /* Not a Map. */ }
  assert.equal(hasMapSlots, false, "Native runtime decoded Map storage instead of a scene object")
  if (seen.has(value)) return seen.get(value)
  let result
  if (Buffer.isBuffer(value)) result = Buffer.from(value)
  else if (ArrayBuffer.isView(value)) {
    const Constructor = globalThis[value.constructor.name]
    assert.ok(Constructor && value.BYTES_PER_ELEMENT, "Unsupported native view")
    result = new Constructor(Uint8Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)).buffer)
  } else {
    assert.notEqual(Object.prototype.toString.call(value), "[object Map]", "Native runtime decoded a Map instead of a scene object")
    result = Array.isArray(value) ? [] : {}
  }
  seen.set(value, result)
  if (Buffer.isBuffer(value) || ArrayBuffer.isView(value)) return result
  const type = value[EXTENSION_TYPE]
  if (type !== undefined) Object.defineProperty(result, EXTENSION_TYPE, { value: type, enumerable: false })
  for (const [key, child] of Object.entries(value)) result[key] = normalizeNativeScene(child, seen)
  return result
}
