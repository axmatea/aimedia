import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import test from "node:test"
import { gzipSync, gunzipSync, brotliCompressSync, brotliDecompressSync, constants as zlibConstants } from "node:zlib"
import { loadKernel } from "../bake-robot-geometry.mjs"
import { decodeNativeScene, normalizeNativeScene } from "../robot-native-codec-oracle.mjs"
import { getExtensionType } from "../robot-scene-codec.mjs"

const root = new URL("../../../", import.meta.url)
const sourceBytes = readFileSync(new URL("public/spline/robot-optimized-v1.splinecode", root))
const candidateBytes = readFileSync(new URL("public/spline/robot-baked-v2.splinecode", root))
const hash = value => createHash("sha256").update(value).digest("hex")
const extensionTag = Symbol("independently-read-extension")
const targets = new Map([
  ["f9212c6d-779c-4c47-bc10-6534ebb36286", ["Head 2", 208, 176]],
  ["377263ac-e2d2-4042-b8f3-b532357d5aeb", ["Hand", 144, 142]],
  ["45226e20-eea5-4e0f-ac46-0c79e0755786", ["Cube 3", 62, 60]],
  ["a19fe3ab-d419-49ec-88c9-01e3ac76f259", ["Cube 2", 54, 52]],
  ["46b3f563-3b31-473b-b869-9612a8f77343", ["Body", 250, 238]],
  ["62b05a0d-e2b8-4d8d-9839-434cc7a75022", ["Cube 3", 68, 64]],
  ["79677ee9-0039-4a29-a7ca-29d4f608cf86", ["Cube 5", 54, 52]],
  ["96a2eb48-7334-42e8-9f7a-fc2037d589ef", ["Cube 4", 32, 30]],
])

// Separate reader from the producer's scene codec. It consumes all bytes and
// retains extension types, typed-array bits, and reference identity, so a shared
// encode/decode mistake cannot hide a changed material, state, asset or alias.
// Its generic map interpretation is NOT native-wire acceptance: the separate
// pinned installed-codec gate below must also accept the complete scene.
function readScene(input) {
  const bytes = Buffer.from(input)
  let offset = 0
  const records = new Map()
  const references = new Map()
  const take = count => {
    assert.ok(count >= 0 && offset + count <= bytes.length, `Truncated scene at ${offset}`)
    const value = bytes.subarray(offset, offset + count)
    offset += count
    return value
  }
  const unsigned = count => { const value = take(count); return value.readUIntBE(0, count) }
  const signed = count => { const value = take(count); return value.readIntBE(0, count) }
  const array = count => Array.from({ length: count }, () => read())
  const object = count => {
    const result = {}
    for (let index = 0; index < count; index++) {
      const key = read()
      assert.equal(typeof key, "string")
      assert.ok(!["__proto__", "constructor", "prototype"].includes(key))
      assert.ok(!Object.hasOwn(result, key))
      result[key] = read()
    }
    return result
  }
  const record = id => {
    let keys = records.get(id)
    assert.ok(keys, `Missing record ${id}`)
    if (keys.highByte === 0) {
      const high = unsigned(1)
      if (high) keys = records.get(id < 32 ? -((high << 5) + id) : (high << 5) + id)
      assert.ok(keys)
    }
    return Object.fromEntries(keys.map(key => [key, read()]))
  }
  const extension = count => {
    const type = unsigned(1)
    const payload = take(count)
    if (type === 114) {
      let id = payload[0] & 63
      const keys = read()
      assert.ok(Array.isArray(keys))
      if (count === 2) {
        keys.highByte = payload[1]
        id = id < 32 ? -((payload[1] << 5) + id) : (payload[1] << 5) + id
      }
      records.set(id, keys)
      return Object.fromEntries(keys.map(key => [key, read()]))
    }
    if (type === 0) return undefined
    if ([1, 2, 3, 4, 5, 6].includes(type)) {
      const next = read()
      const value = type === 4 ? { id: next } : type === 5 ? { data: next } : next
      Object.defineProperty(value, extensionTag, { value: type })
      return value
    }
    if (type === 105) {
      const id = payload.readUInt32BE()
      const value = read()
      assert.ok(!references.has(id))
      references.set(id, value)
      return value
    }
    if (type === 112) {
      const id = payload.readUInt32BE()
      assert.ok(references.has(id), `Missing reference ${id}`)
      return references.get(id)
    }
    if (type === 116) {
      const Constructor = [Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array, BigInt64Array, BigUint64Array][payload[0]]
      assert.ok(Constructor)
      return new Constructor(Uint8Array.from(payload.subarray(1)).buffer)
    }
    throw new Error(`Unexpected extension ${type}`)
  }
  function read() {
    const token = unsigned(1)
    if (token <= 0x7f) return token >= 0x40 && records.has(token & 63) ? record(token & 63) : token
    if (token >= 0xe0) return token - 256
    if (token >= 0xa0 && token <= 0xbf) return take(token & 31).toString("utf8")
    if (token >= 0x90 && token <= 0x9f) return array(token & 15)
    if (token >= 0x80 && token <= 0x8f) return object(token & 15)
    switch (token) {
      case 0xc0: return null
      case 0xc2: return false
      case 0xc3: return true
      case 0xc4: return Buffer.from(take(unsigned(1)))
      case 0xc5: return Buffer.from(take(unsigned(2)))
      case 0xc6: return Buffer.from(take(unsigned(4)))
      case 0xc7: return extension(unsigned(1))
      case 0xc8: return extension(unsigned(2))
      case 0xc9: return extension(unsigned(4))
      case 0xca: return take(4).readFloatBE()
      case 0xcb: return take(8).readDoubleBE()
      case 0xcc: return unsigned(1)
      case 0xcd: return unsigned(2)
      case 0xce: return unsigned(4)
      case 0xcf: return take(8).readBigUInt64BE()
      case 0xd0: return signed(1)
      case 0xd1: return signed(2)
      case 0xd2: return signed(4)
      case 0xd3: return take(8).readBigInt64BE()
      case 0xd4: return extension(1)
      case 0xd5: return extension(2)
      case 0xd6: return extension(4)
      case 0xd7: return extension(8)
      case 0xd8: return extension(16)
      case 0xd9: return take(unsigned(1)).toString("utf8")
      case 0xda: return take(unsigned(2)).toString("utf8")
      case 0xdb: return take(unsigned(4)).toString("utf8")
      case 0xdc: return array(unsigned(2))
      case 0xdd: return array(unsigned(4))
      case 0xde: return object(unsigned(2))
      case 0xdf: return object(unsigned(4))
      default: throw new Error(`Unexpected token ${token} at ${offset - 1}`)
    }
  }
  const result = read()
  assert.equal(offset, bytes.length, "No uninspected trailing scene data")
  return result
}

const source = readScene(sourceBytes)
const candidate = readScene(candidateBytes)
function objects(scene) {
  const output = new Map()
  function visit(nodes, parent = null) {
    for (const node of nodes ?? []) {
      assert.ok(!output.has(node.id))
      output.set(node.id, { ...node, parent })
      visit(node.children, node.id)
    }
  }
  visit(scene.scene.objects)
  return output
}
const originals = objects(source)
const baked = objects(candidate)

function rawBytes(array) { return Buffer.from(array.buffer, array.byteOffset, array.byteLength) }
function assertSameNongeometry(left, right, ignoreGeometry = true) {
  const excluded = new Set(ignoreGeometry ? [...targets.keys()].map(id => originals.get(id).data.geometry) : [])
  const forward = new WeakMap()
  const reverse = new WeakMap()
  let skipped = 0
  function compare(a, b, path = "scene") {
    if (a === null || typeof a !== "object") { assert.equal(b, a, path); return }
    assert.ok(b !== null && typeof b === "object", path)
    if (excluded.has(a)) { assert.equal(b.type, "NonParametricGeometry", path); skipped++; return }
    if (forward.has(a)) { assert.equal(b, forward.get(a), `Changed shared reference at ${path}`); return }
    assert.ok(!reverse.has(b), `Merged formerly distinct objects at ${path}`)
    forward.set(a, b)
    reverse.set(b, a)
    assert.equal(b[extensionTag], a[extensionTag], `Changed extension at ${path}`)
    assert.equal(b.constructor, a.constructor, path)
    if (ArrayBuffer.isView(a)) { assert.ok(rawBytes(a).equals(rawBytes(b)), path); return }
    assert.deepEqual(Object.keys(b).sort(), Object.keys(a).sort(), path)
    for (const key of Object.keys(a)) compare(a[key], b[key], `${path}.${key}`)
  }
  compare(left, right)
  assert.equal(skipped, ignoreGeometry ? 8 : 0)
}

function nativeWithIndependentTags(value, seen = new Map()) {
  if (value === null || typeof value !== "object") return value
  if (seen.has(value)) return seen.get(value)
  const result = Buffer.isBuffer(value) ? Buffer.from(value) : ArrayBuffer.isView(value) ? value.slice() : Array.isArray(value) ? [] : {}
  seen.set(value, result)
  if (ArrayBuffer.isView(value)) return result
  const type = getExtensionType(value)
  if (type !== undefined) Object.defineProperty(result, extensionTag, { value: type })
  for (const [key, child] of Object.entries(value)) result[key] = nativeWithIndependentTags(child, seen)
  return result
}

function assertNoNativeMaps(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return
  let hasMapSlots = false
  try { Map.prototype.has.call(value, undefined); hasMapSlots = true } catch { /* Not a Map, including cross-realm objects. */ }
  // Native extension1/6 changes Map.prototype to an inert scene prototype.
  // That hides the toString tag but cannot remove the intrinsic Map slots.
  assert.equal(hasMapSlots, false, "Native Map must not be normalized into a scene object")
  seen.add(value)
  if (ArrayBuffer.isView(value)) return
  for (const child of Object.values(value)) assertNoNativeMaps(child, seen)
}

function assertNativeWireScene(bytes, expectedGeometryType) {
  const native = decodeNativeScene(bytes)
  // Cross-realm instanceof Object/Map is unreliable. Check the actual native
  // result before normalization can obscure the wire-level map/object flavor.
  assert.equal(Object.prototype.toString.call(native), "[object Object]", "Native root must be a scene Object, not Map")
  assertNoNativeMaps(native)
  assert.equal(native.schema, 114)
  assert.equal(native.version, "1.9.5")
  assert.equal(Object.prototype.toString.call(native.scene), "[object Object]")
  assert.ok(Array.isArray(native.scene.objects))
  const normalized = nativeWithIndependentTags(normalizeNativeScene(native))
  const independent = readScene(bytes)
  // No geometry exclusions: compare the complete native tree, including every
  // baked array and shared-reference relationship, against the separate reader.
  assertSameNongeometry(independent, normalized, false)
  const nativeObjects = objects(normalized)
  assert.equal(nativeObjects.size, 76)
  for (const id of targets.keys()) assert.equal(nativeObjects.get(id).data.geometry.type, expectedGeometryType)
  return normalized
}

// Direct raw-kernel oracle, intentionally independent of bakeGeometry() and its
// tuple deduplication. It follows installed runtime ui.allocate/get_mesh_data:
// apply scaleBaked once, request level 0 CONTROL and level 2 REFINED with angle35.
async function referenceMeshes() {
  assert.equal(hash(sourceBytes), "2937966ae88b97a5386f78e124737713303330307c47a02e3f7b3cc1f8061fd1")
  const kernel = await loadKernel()
  assert.equal(kernel.Level.CONTROL.value, 0)
  assert.equal(kernel.Level.REFINED.value, 1)
  const result = new Map()
  for (const id of targets.keys()) {
    const geometry = originals.get(id).data.geometry
    const positions = geometry.positionWASM
    const indices = geometry.indexWASM
    const faces = Uint32Array.from(geometry.verticesPerFaceWASM)
    const pointer = kernel._malloc(positions.byteLength + indices.byteLength + faces.byteLength)
    const indexPointer = pointer + positions.byteLength
    const facePointer = indexPointer + indices.byteLength
    kernel.HEAPF32.set(positions, pointer >>> 2)
    kernel.HEAPU32.set(indices, indexPointer >>> 2)
    kernel.HEAPU32.set(faces, facePointer >>> 2)
    const args = [pointer, positions.length, indexPointer, indices.length, facePointer, faces.length]
    const scale = geometry.scaleBaked
    let surface
    try {
      surface = scale.every(value => value === 1) ? kernel.alloc_subdivision_surface(...args) : kernel.alloc_subdivision_surface2(...args, [
        scale[0], 0, 0, 0, 0, scale[1], 0, 0, 0, 0, scale[2], 0, 0, 0, 0, 1,
      ])
    } finally { kernel._free(pointer) }
    assert.ok(surface)
    const extract = level => {
      const outPointer = kernel.get_mesh_data(surface, level, 35)
      try {
        const header = kernel.HEAPU32.slice(outPointer >>> 2, (outPointer >>> 2) + 8)
        const arrays = [Float32Array, Float32Array, Uint32Array, Uint32Array].map((Constructor, index) => {
          const dataPointer = kernel.HEAPU32[header[index] >>> 2]
          const heap = Constructor === Float32Array ? kernel.HEAPF32 : kernel.HEAPU32
          return heap.slice(dataPointer >>> 2, (dataPointer >>> 2) + header[index + 4])
        })
        return { position: arrays[0], normal: arrays[1], faceMap: arrays[2], index: arrays[3] }
      } finally { kernel.free_mesh_data(outPointer) }
    }
    try {
      kernel.set_destination_refinement_level(surface, 0)
      const control = extract(kernel.Level.CONTROL)
      kernel.set_destination_refinement_level(surface, 2)
      result.set(id, { control, refined: extract(kernel.Level.REFINED) })
    } finally { kernel.free_bvh(surface); kernel.free_subdivision_surface(surface) }
  }
  return result
}
const references = referenceMeshes()

function dimensions(position) {
  return [0, 1, 2].map(axis => {
    let min = Infinity
    let max = -Infinity
    for (let index = axis; index < position.length; index += 3) { min = Math.min(min, position[index]); max = Math.max(max, position[index]) }
    return max - min
  })
}
function expanded(mesh, field) {
  const values = mesh[field]
  const output = new Float32Array(mesh.index.length * 3)
  for (let corner = 0; corner < mesh.index.length; corner++) {
    assert.ok(mesh.index[corner] < values.length / 3, "Triangle index out of range")
    output.set(values.subarray(mesh.index[corner] * 3, mesh.index[corner] * 3 + 3), corner * 3)
  }
  return output
}
function candidateMesh(geometry) {
  assert.equal(geometry.type, "NonParametricGeometry")
  assert.equal(geometry.subdivisions, 0)
  const { attributes, index, groups } = geometry.data
  assert.deepEqual(Object.keys(attributes).sort(), ["normal", "position"])
  for (const name of ["position", "normal"]) {
    assert.ok(attributes[name].array instanceof Float32Array)
    assert.equal(attributes[name].type, "Float32Array")
    assert.equal(attributes[name].itemSize, 3)
    assert.equal(attributes[name].normalized, false)
  }
  assert.ok(index.array instanceof Uint16Array || index.array instanceof Uint32Array)
  assert.equal(index.type, index.array.constructor.name)
  assert.equal(index.itemSize, 1)
  assert.equal(index.normalized, false)
  assert.equal(index.array.length % 3, 0)
  assert.deepEqual(groups, [{ start: 0, count: index.array.length, materialIndex: 0 }])
  return { position: attributes.position.array, normal: attributes.normal.array, index: index.array }
}
function assertTriangles(reference, actual) {
  assert.equal(actual.index.length, reference.index.length, "Triangle count/order must remain")
  for (const field of ["position", "normal"]) assert.ok(rawBytes(expanded(reference, field)).equals(rawBytes(expanded(actual, field))), `Changed triangle-expanded ${field} bytes`)
}

const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
function multiply(a, b) {
  const result = new Array(16).fill(0)
  for (let col = 0; col < 4; col++) for (let row = 0; row < 4; row++) for (let inner = 0; inner < 4; inner++) result[col * 4 + row] += a[inner * 4 + row] * b[col * 4 + inner]
  return result
}
function trs(data) {
  const [x, y, z] = (data.rotation ?? [0, 0, 0]).map(value => value * Math.PI / 180)
  const [sx, sy, sz] = data.scale ?? [1, 1, 1]
  const a = Math.cos(x), b = Math.sin(x), c = Math.cos(y), d = Math.sin(y), e = Math.cos(z), f = Math.sin(z)
  return [c * e * sx, (a * f + b * e * d) * sx, (b * f - a * e * d) * sx, 0,
    -c * f * sy, (a * e - b * f * d) * sy, (b * e + a * f * d) * sy, 0,
    d * sz, -b * c * sz, a * c * sz, 0, ...(data.position ?? [0, 0, 0]), 1]
}
function placements(scene) {
  const byId = objects(scene)
  const output = new Map()
  function visit(node, parent, prefix = "") {
    // Installed runtime uses parent * hiddenMatrix * TRS * pivotMatrix. No
    // source object defines a pivot; its common runtime default is identity.
    assert.equal(node.data.pivot, undefined)
    assert.equal(node.data.pivotMatrix, undefined)
    const world = multiply(multiply(parent, node.data.hiddenMatrix ?? identity()), trs(node.data))
    if (targets.has(node.id)) output.set(`${prefix}${node.id}`, { id: node.id, world })
    for (const child of node.children ?? []) visit(child, world, prefix)
    if (node.data.type === "Instance") {
      assert.deepEqual(node.data.overrides, {})
      const component = byId.get(node.data.component)
      assert.equal(component.data.type, "Component")
      for (const child of component.children ?? []) visit(child, world, `${node.id}/`)
    }
  }
  for (const node of scene.scene.objects) visit(node, identity())
  return output
}
function toWorld(values, matrix, normal = false) {
  const output = new Float64Array(values.length)
  let coefficients = matrix
  if (normal) {
    const [a, d, g, , b, e, h, , c, f, i] = matrix
    const determinant = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)
    assert.notEqual(determinant, 0)
    coefficients = [(e * i - f * h), (c * h - b * i), (b * f - c * e), 0,
      (f * g - d * i), (a * i - c * g), (c * d - a * f), 0,
      (d * h - e * g), (b * g - a * h), (a * e - b * d), 0].map(value => value / determinant)
  }
  for (let offset = 0; offset < values.length; offset += 3) {
    const x = values[offset], y = values[offset + 1], z = values[offset + 2]
    const transformed = [0, 1, 2].map(axis => coefficients[axis] * x + coefficients[4 + axis] * y + coefficients[8 + axis] * z + (normal ? 0 : matrix[12 + axis]))
    const length = normal ? Math.hypot(...transformed) || 1 : 1
    output.set(transformed.map(value => value / length), offset)
  }
  return output
}

test("bake inputs remain the exact reviewed source and installed modeling kernel", () => {
  assert.equal(hash(sourceBytes), "2937966ae88b97a5386f78e124737713303330307c47a02e3f7b3cc1f8061fd1")
  assert.equal(hash(readFileSync(new URL("public/spline/robot.splinecode", root))), "4e31d7ef0b54fd02e2dd373f18f89c32003ce6d9220a996e09c94efa4c7c31f9")
  assert.equal(hash(readFileSync(new URL("public/spline/process.wasm", root))), "c87c49d7941dc4a039c75062836fb4f34029b996648d35295e41b7f221e35a2b")
  assert.equal(originals.size, 76)
  assert.equal(baked.size, 76)
  assert.deepEqual([...baked.keys()], [...originals.keys()])
  assert.equal([...originals.values()].filter(node => node.data.geometry?.type === "SubdivGeometry").length, 8)
  assert.equal([...baked.values()].filter(node => node.data.geometry?.type === "NonParametricGeometry").length, 8)
  assert.equal([...baked.values()].filter(node => node.data.geometry?.type === "SubdivGeometry").length, 0)
  for (const [id, [name, vertices, faces]] of targets) {
    const data = originals.get(id).data
    assert.equal(data.name, name)
    assert.equal(data.geometry.positionWASM.length, vertices * 3)
    assert.equal(data.geometry.verticesPerFaceWASM.length, faces)
    assert.equal(data.geometry.subdivisions, 2)
    assert.equal(data.geometry.phongAngle, 35)
    assert.equal(data.flatShading, false)
  }
})

test("the exact installed native codec accepts the full source and eight baked geometry payloads as scene objects", () => {
  assertNativeWireScene(sourceBytes, "SubdivGeometry")
  assertNativeWireScene(candidateBytes, "NonParametricGeometry")
})

test("native wire validation rejects ordinary maps even when a custom reader reports schema114", () => {
  // {schema:114} as an ordinary MessagePack map reproduces the old encoder bug:
  // custom readers see an Object, but native mapsAsObjects:false produces Map.
  const rootMap = Buffer.from("81a6736368656d61cc72", "hex")
  assert.equal(readScene(rootMap).schema, 114)
  assert.equal(Object.prototype.toString.call(decodeNativeScene(rootMap)), "[object Map]")
  assert.throws(() => assertNativeWireScene(rootMap, "NonParametricGeometry"), /Native root must be a scene Object, not Map/)

  // A valid record root with schema114 can still conceal a nested ordinary map.
  // Require native recursive normalization, not just a successful root check.
  const nestedMap = Buffer.from("d4724092a6736368656d61a57363656e65cc7281a76f626a6563747390", "hex")
  assert.equal(readScene(nestedMap).schema, 114)
  const native = decodeNativeScene(nestedMap)
  assert.equal(native.schema, 114)
  assert.equal(Object.prototype.toString.call(native.scene), "[object Map]")
  assert.throws(() => normalizeNativeScene(native), /Map (?:storage )?instead of a scene object/)
})

test("native wire validation rejects Maps hidden behind extension1/6 scene prototypes", () => {
  const size = Object.getOwnPropertyDescriptor(Map.prototype, "size").get
  for (const type of [1, 6]) for (const populated of [false, true]) {
    const bytes = Buffer.from(populated ? [0xd4, type, 0, 0x81, 0xa1, 0x61, 1] : [0xd4, type, 0, 0x80])
    const native = decodeNativeScene(bytes)
    assert.equal(Object.prototype.toString.call(native), "[object Object]", "Fixture must reproduce the hidden-Map tag bypass")
    assert.equal(size.call(native), populated ? 1 : 0, "Prototype replacement must not hide actual Map slots")
    assert.throws(() => assertNoNativeMaps(native), /Native Map must not be normalized/)
    assert.throws(() => normalizeNativeScene(native), /Map (?:storage )?instead of a scene object/)
  }
})

test("gzip and Brotli delivery companions reproduce and decode to the exact reviewed scene", () => {
  const manifest = JSON.parse(readFileSync(new URL("scripts/deployment/robot-geometry-bake.json", root), "utf8"))
  const rawHash = "4a31a1bf601dd4e3db02f4b11542ac17801e5032edd432c5375f346ba6182fd0"
  assert.equal(hash(candidateBytes), rawHash)
  assert.equal(candidateBytes.length, 1491027)
  assert.equal(manifest.output.sha256, rawHash)
  for (const [name, size, expectedHash, decode, encode] of [
    ["gzip", 1305133, "5ee5440945f092e7c0ee4333d823c0717a4869e48bea75fb04abfc2df8863151", gunzipSync, value => gzipSync(value, { level: 9 })],
    ["brotli", 1216569, "7ac5e5e2c8c66d009cae1afb3712e3769c15bf56b259ea53022082bb96d64b51", brotliDecompressSync, value => brotliCompressSync(value, { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 } })],
  ]) {
    const entry = manifest[name]
    const encoded = readFileSync(new URL(entry.path, root))
    assert.equal(encoded.length, size)
    assert.equal(entry.bytes, size)
    assert.equal(entry.sha256, expectedHash)
    assert.equal(hash(encoded), expectedHash)
    assert.equal(entry.decodedSha256, rawHash)
    assert.ok(decode(encoded).equals(candidateBytes), `${name} changed scene bytes`)
    if (process.versions.node === entry.node && process.versions.zlib === entry.zlib) assert.ok(encode(candidateBytes).equals(encoded), `${name} is not reproducible`)
  }
})

test("all nongeometry data, extension types and bidirectional aliases remain exact", () => {
  assertSameNongeometry(source, candidate)
})

test("all eight baked meshes exactly match independently executed WASM triangle positions and normals", async () => {
  const expected = await references
  for (const id of targets.keys()) assertTriangles(expected.get(id).refined, candidateMesh(baked.get(id).data.geometry))
})

test("control bounds preserve material projection dimensions without generic input rescaling or double scaleBaked", async () => {
  const expected = await references
  let authoredDimensionsDiffer = 0
  for (const id of targets.keys()) {
    const geometry = baked.get(id).data.geometry
    const control = dimensions(expected.get(id).control.position)
    const parameters = { width: control[0], height: control[1], depth: control[2] }
    assert.deepEqual(geometry.userData.parameters, parameters)
    assert.deepEqual([geometry.width, geometry.height, geometry.depth], control)
    assert.deepEqual([geometry.width / parameters.width, geometry.height / parameters.height, geometry.depth / parameters.depth], [1, 1, 1])
    assert.equal(geometry.scaleBaked, undefined)
    assert.equal(geometry.positionWASM, undefined)
    assert.equal(geometry.indexWASM, undefined)
    assert.equal(geometry.verticesPerFaceWASM, undefined)
    if (["width", "height", "depth"].some((key, axis) => originals.get(id).data.geometry[key] !== control[axis])) authoredDimensionsDiffer++
  }
  assert.ok(authoredDimensionsDiffer > 0, "Fixture must exercise stale authored dimensions, not only identity boxes")
})

test("world positions and inverse-transpose normals remain exact for templates and mirrored component instances", async () => {
  const expected = await references
  const before = placements(source)
  const after = placements(candidate)
  assert.equal(before.size, 14, "Eight templates plus mirrored three-mesh arm and leg instances")
  assert.deepEqual([...after.keys()], [...before.keys()])
  assert.equal([...before.keys()].filter(key => key.includes("/")).length, 6)
  for (const [key, placement] of before) {
    const other = after.get(key)
    assert.deepEqual(other.world, placement.world)
    const reference = expected.get(placement.id).refined
    const actual = candidateMesh(baked.get(placement.id).data.geometry)
    for (const field of ["position", "normal"]) {
      const originalWorld = toWorld(expanded(reference, field), placement.world, field === "normal")
      const candidateWorld = toWorld(expanded(actual, field), other.world, field === "normal")
      assert.ok(rawBytes(originalWorld).equals(rawBytes(candidateWorld)), `${key} changed world ${field}`)
    }
  }
})

test("semantic guards reject material and rig/event/state mutations, not just mesh changes", () => {
  for (const mutate of [
    scene => { objects(scene).get("f9212c6d-779c-4c47-bc10-6534ebb36286").data.material = "changed" },
    scene => { objects(scene).get("3bf648bf-4bd4-4f9f-9bf1-288da3ec4f43").data.rotation[0] += 1 },
    scene => { objects(scene).get("3bf648bf-4bd4-4f9f-9bf1-288da3ec4f43").data.events[0].data.distance += 1 },
    scene => { objects(scene).get("377263ac-e2d2-4042-b8f3-b532357d5aeb").data.states[0].data.geometry.width = 123 },
    scene => { objects(scene).get("0e40bf46-c74d-4e0a-903b-e7c4adc5d818").data.scale[0] = 1 },
  ]) {
    const changed = readScene(candidateBytes)
    mutate(changed)
    assert.throws(() => assertSameNongeometry(source, changed))
  }
})

test("a byte-identical clone cannot silently break a shared nongeometry reference", () => {
  const changed = readScene(candidateBytes)
  const excluded = new Set([...targets.keys()].map(id => objects(changed).get(id).data.geometry))
  const seen = new WeakSet()
  function breakAlias(value) {
    if (value === null || typeof value !== "object" || excluded.has(value) || ArrayBuffer.isView(value)) return false
    seen.add(value)
    for (const key of Object.keys(value)) {
      const next = value[key]
      if (next === null || typeof next !== "object" || excluded.has(next)) continue
      if (seen.has(next)) {
        const clone = Buffer.isBuffer(next) ? Buffer.from(next) : ArrayBuffer.isView(next) ? next.slice() : Array.isArray(next) ? [...next] : { ...next }
        if (next[extensionTag] !== undefined) Object.defineProperty(clone, extensionTag, { value: next[extensionTag] })
        value[key] = clone
        return true
      }
      if (breakAlias(next)) return true
    }
    return false
  }
  assert.equal(breakAlias(changed), true, "Fixture must include a shared nongeometry object")
  assert.throws(() => assertSameNongeometry(source, changed), /Changed shared reference|Merged formerly distinct objects/)
})

test("triangle oracle rejects one changed position, normal or winding even after lossless tuple deduplication", async () => {
  const reference = (await references).get(targets.keys().next().value).refined
  const geometry = baked.get(targets.keys().next().value).data.geometry
  for (const field of ["position", "normal", "index"]) {
    const mesh = candidateMesh(geometry)
    mesh[field] = mesh[field].slice()
    if (field === "index") [mesh.index[0], mesh.index[1]] = [mesh.index[1], mesh.index[0]]
    else mesh[field][0] += 1
    assert.throws(() => assertTriangles(reference, mesh))
  }
})
