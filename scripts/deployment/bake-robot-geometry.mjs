// Offline experiment only. The deployed browser continues to use the unmodified
// Spline runtime. This converter is deliberately pinned to one reviewed scene,
// runtime and modelling kernel; it is not a general Spline editor/export API.
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { lstat, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { gzipSync, brotliCompressSync, constants as zlibConstants } from "node:zlib"
import { decodeScene, encodeScene } from "./robot-scene-codec.mjs"
import { decodeNativeScene, normalizeNativeScene } from "./robot-native-codec-oracle.mjs"

export const SOURCE_PATH = "public/spline/robot-optimized-v1.splinecode"
export const OUTPUT_PATH = "public/spline/robot-baked-v2.splinecode"
export const GZIP_PATH = "public/spline/robot-baked-v2-gzip.splinecode"
export const BROTLI_PATH = "public/spline/robot-baked-v2-br.splinecode"
export const MANIFEST_PATH = "scripts/deployment/robot-geometry-bake.json"
export const SOURCE_HASH = "2937966ae88b97a5386f78e124737713303330307c47a02e3f7b3cc1f8061fd1"
export const TARGET_IDS = [
  "f9212c6d-779c-4c47-bc10-6534ebb36286",
  "377263ac-e2d2-4042-b8f3-b532357d5aeb",
  "45226e20-eea5-4e0f-ac46-0c79e0755786",
  "a19fe3ab-d419-49ec-88c9-01e3ac76f259",
  "46b3f563-3b31-473b-b869-9612a8f77343",
  "62b05a0d-e2b8-4d8d-9839-434cc7a75022",
  "79677ee9-0039-4a29-a7ca-29d4f608cf86",
  "96a2eb48-7334-42e8-9f7a-fc2037d589ef",
]
const hashes = {
  runtime: "b640ca5e0d3930489580f8ed6c3a7757b60767f6b6ce9768ed8df6a0f5709348",
  wrapper: "08ba000a06b6a37c906bf0e15f319aabea67060d3f0f9005baea6d212aa05db1",
  wasm: "c87c49d7941dc4a039c75062836fb4f34029b996648d35295e41b7f221e35a2b",
}
const root = fileURLToPath(new URL("../../", import.meta.url))
const sourceFile = new URL(`../../${SOURCE_PATH}`, import.meta.url)
const wasmFile = new URL("../../public/spline/process.wasm", import.meta.url)
export const sha256 = value => createHash("sha256").update(value).digest("hex")
export const bytesOf = array => Buffer.from(array.buffer, array.byteOffset, array.byteLength)
let kernelPromise

export async function loadKernel() {
  if (!kernelPromise) kernelPromise = (async () => {
    const runtimeUrl = new URL(import.meta.resolve("@splinetool/runtime"))
    const wrapperUrl = new URL("./process.js", runtimeUrl)
    const [runtime, wrapper, wasm] = await Promise.all([readFile(runtimeUrl), readFile(wrapperUrl), readFile(wasmFile)])
    for (const [name, data] of Object.entries({ runtime, wrapper, wasm })) assert.equal(sha256(data), hashes[name], `${name} changed: review a new bake version`)
    const { default: factory } = await import(wrapperUrl.href)
    return factory({ wasmBinary: wasm })
  })()
  return kernelPromise
}

export function geometryBounds(position) {
  assert.equal(position.length % 3, 0)
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
  for (let index = 0; index < position.length; index++) {
    const value = position[index], axis = index % 3
    assert.ok(Number.isFinite(value), "Non-finite geometry")
    min[axis] = Math.min(min[axis], value)
    max[axis] = Math.max(max[axis], value)
  }
  return { min, max, size: max.map((value, index) => value - min[index]), center: max.map((value, index) => (value + min[index]) / 2) }
}

function copyMesh(kernel, surface, level, angle) {
  const pointer = kernel.get_mesh_data(surface, level, angle)
  assert.ok(pointer > 0, "Kernel returned no mesh")
  try {
    const header = kernel.HEAPU32.slice(pointer >>> 2, (pointer >>> 2) + 8)
    const arrays = [kernel.HEAPF32, kernel.HEAPF32, kernel.HEAPU32, kernel.HEAPU32].map((heap, index) => {
      const dataPointer = kernel.HEAPU32[header[index] >>> 2]
      const count = header[index + 4]
      assert.ok(count > 0 && count < 100_000_000 && dataPointer % 4 === 0)
      // The modelling kernel owns all returned pointers. Copy before freeing.
      return heap.slice(dataPointer >>> 2, (dataPointer >>> 2) + count)
    })
    const [position, normal, faceMap, index] = arrays
    assert.equal(position.length, normal.length)
    assert.equal(index.length % 3, 0)
    // Control cages may include triangles/pentagons: the kernel's editor-only
    // face map is not universally one entry per rendered triangle.
    for (const value of index) assert.ok(value < position.length / 3)
    return { position, normal, faceMap, index }
  } finally { kernel.free_mesh_data(pointer) }
}

// Weld only bit-identical position+normal tuples. There is no quantization,
// normal regeneration, vertex reordering within triangles, or LOD reduction.
export function compactMesh(mesh) {
  const positions = [], normals = [], indices = []
  const tuples = new Map(), p = new Uint32Array(mesh.position.buffer, mesh.position.byteOffset, mesh.position.length)
  const n = new Uint32Array(mesh.normal.buffer, mesh.normal.byteOffset, mesh.normal.length)
  for (const oldIndex of mesh.index) {
    const offset = oldIndex * 3
    const key = `${p[offset]},${p[offset + 1]},${p[offset + 2]},${n[offset]},${n[offset + 1]},${n[offset + 2]}`
    let index = tuples.get(key)
    if (index === undefined) {
      index = positions.length / 3
      tuples.set(key, index)
      for (let axis = 0; axis < 3; axis++) {
        positions.push(mesh.position[offset + axis])
        normals.push(mesh.normal[offset + axis])
      }
    }
    indices.push(index)
  }
  const Index = positions.length / 3 <= 65536 ? Uint16Array : Uint32Array
  return { position: new Float32Array(positions), normal: new Float32Array(normals), index: new Index(indices) }
}

export function bakeGeometry(kernel, sourceGeometry) {
  const g = sourceGeometry
  assert.equal(g.type, "SubdivGeometry")
  assert.equal(g.subdivisions, 2)
  assert.equal(g.phongAngle, 35)
  assert.ok(g.positionWASM instanceof Float32Array)
  assert.ok(g.indexWASM instanceof Uint32Array)
  assert.ok(g.verticesPerFaceWASM instanceof Uint8Array)
  assert.ok(g.scaleBaked.length === 3 && g.scaleBaked.every(value => typeof value === "number" && Number.isFinite(value) && value > 0))
  const positions = g.positionWASM, indices = g.indexWASM, faces = g.verticesPerFaceWASM
  assert.equal([...faces].reduce((sum, value) => sum + value, 0), indices.length)
  const inputPointer = kernel._malloc((positions.length + indices.length + faces.length) * 4)
  assert.ok(inputPointer > 0)
  let surface
  try {
    const indexPointer = inputPointer + positions.byteLength
    const facePointer = indexPointer + indices.byteLength
    kernel.HEAPF32.set(positions, inputPointer >>> 2)
    kernel.HEAPU32.set(indices, indexPointer >>> 2)
    kernel.HEAPU32.set(faces, facePointer >>> 2)
    const args = [inputPointer, positions.length, indexPointer, indices.length, facePointer, faces.length]
    const [x, y, z] = g.scaleBaked
    surface = g.scaleBaked.every(value => value === 1)
      ? kernel.alloc_subdivision_surface(...args)
      : kernel.alloc_subdivision_surface2(...args, [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1])
  } finally { kernel._free(inputPointer) }
  assert.ok(surface > 0)
  let control, refined
  try {
    kernel.set_destination_refinement_level(surface, 0)
    control = copyMesh(kernel, surface, kernel.Level.CONTROL, g.phongAngle)
    kernel.set_destination_refinement_level(surface, g.subdivisions)
    refined = copyMesh(kernel, surface, kernel.Level.REFINED, g.phongAngle)
  } finally {
    kernel.free_bvh(surface)
    kernel.free_subdivision_surface(surface)
  }
  const compact = compactMesh(refined)
  const controlBounds = geometryBounds(control.position)
  const [width, height, depth] = controlBounds.size
  const dimensions = { width, height, depth }
  const attribute = array => ({ array, itemSize: 3, type: "Float32Array", normalized: false })
  const geometry = {
    type: "NonParametricGeometry", ...dimensions, subdivisions: 0,
    // Runtime q3.build uses this existing BufferGeometry metadata instead of
    // refined vertex bounds when deciding whether to rescale imported geometry.
    // Matching it preserves both exact vertices and original dimension uniforms.
    userData: { parameters: { ...dimensions } },
    data: {
      index: { array: compact.index, itemSize: 1, type: compact.index.constructor.name, normalized: false },
      attributes: { position: attribute(compact.position), normal: attribute(compact.normal) },
      groups: [{ start: 0, count: compact.index.length, materialIndex: 0 }],
    },
  }
  return { control, refined, compact, controlBounds, refinedBounds: geometryBounds(refined.position), geometry }
}

export function sceneNodes(scene) {
  const nodes = []
  const visit = node => { nodes.push(node); for (const child of node.children ?? []) visit(child) }
  for (const node of scene.scene.objects) visit(node)
  return nodes
}

function assertStaticScene(scene) {
  assert.equal(scene.schema, 114)
  assert.equal(scene.version, "1.9.5")
  assert.equal(scene.shared.variables.length, 0)
  for (const node of sceneNodes(scene)) {
    const data = node.data
    if (data.type === "Page") assert.equal(data.globalPhysics.usePhysics, false)
    for (const state of data.states ?? []) {
      const geometry = state.data?.geometry
      assert.ok(geometry === undefined || Object.keys(geometry).length === 0, "Geometry-animated scene must not be statically baked")
    }
    for (const event of data.events ?? []) assert.ok(["Start", "LookAt"].includes(event.data.type), "Surface-dependent interaction requires a new review")
    if (data.geometry?.type === "SubdivGeometry") {
      assert.equal(data.flatShading, false)
      assert.equal(data.cloner, null)
      for (const field of ["bindMode", "bindMatrix", "morphTargetInfluences"]) assert.equal(data[field], undefined)
    }
  }
}

export async function buildBakedRobotScene(source) {
  assert.equal(sha256(source), SOURCE_HASH, "Original optimized scene changed; do not overwrite a reviewed bake")
  const scene = decodeScene(source)
  assert.deepEqual(normalizeNativeScene(decodeNativeScene(source)), scene, "Native source decoding differs from offline codec")
  assertStaticScene(scene)
  const targets = sceneNodes(scene).filter(node => node.data.geometry?.type === "SubdivGeometry")
  assert.deepEqual(targets.map(node => node.id).sort(), [...TARGET_IDS].sort())
  const kernel = await loadKernel()
  const meshes = []
  for (const node of targets) {
    const baked = bakeGeometry(kernel, node.data.geometry)
    node.data.geometry = baked.geometry
    meshes.push({
      id: node.id, name: node.data.name,
      verticesBeforeWeld: baked.refined.position.length / 3,
      verticesAfterWeld: baked.compact.position.length / 3,
      triangles: baked.refined.index.length / 3,
      controlBounds: baked.controlBounds, refinedBounds: baked.refinedBounds,
      buffers: Object.fromEntries(Object.entries(baked.compact).map(([name, value]) => [name, { bytes: value.byteLength, type: value.constructor.name, sha256: sha256(bytesOf(value)) }])),
    })
  }
  const buffer = encodeScene(scene)
  const gzip = gzipSync(buffer, { level: 9 })
  const brotli = brotliCompressSync(buffer, { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 } })
  // Check that the emitted asset is accepted by the strict independent format
  // reader and no subdivision helper can be discovered in the output scene.
  const decoded = decodeScene(buffer)
  assert.deepEqual(decoded, scene)
  assert.deepEqual(normalizeNativeScene(decodeNativeScene(buffer)), scene, "Native runtime cannot decode the emitted scene identically")
  assert.equal(sceneNodes(decoded).filter(node => node.data.geometry?.type === "SubdivGeometry").length, 0)
  const manifest = {
    schemaVersion: 1,
    source: { path: SOURCE_PATH, bytes: source.length, sha256: SOURCE_HASH },
    output: { path: OUTPUT_PATH, bytes: buffer.length, sha256: sha256(buffer) },
    gzip: { path: GZIP_PATH, bytes: gzip.length, sha256: sha256(gzip), level: 9, decodedSha256: sha256(buffer), node: process.versions.node, zlib: process.versions.zlib },
    brotli: { path: BROTLI_PATH, bytes: brotli.length, sha256: sha256(brotli), quality: 11, decodedSha256: sha256(buffer), node: process.versions.node, zlib: process.versions.zlib },
    kernel: { runtimeVersion: "1.12.70", hashes },
    encoding: "Native msgpackr object records, custom extension types and reference aliases; complete source/output semantic trees are checked by the exact installed native unpacker before any file write.",
    algorithm: "Exact installed WASM CONTROL 0 then REFINED 2, phong 35, source scaleBaked; weld bit-identical position/normal tuples and narrow indices losslessly. No UV generation, quantization, normal regeneration or animation change.",
    dimensions: "Control-cage bounds are retained as generic width/height/depth and BufferGeometry userData.parameters, preventing auto-rescale and preserving dimension uniforms; refined positions/normals retain exact triangle attribute bits.",
    comparison: { rawBytesDelta: buffer.length - source.length, gzip9Source: gzipSync(source, { level: 9 }).length, gzip9Output: gzip.length, brotliSource: brotliCompressSync(source).length, brotliOutput: brotli.length },
    caution: "Experimental asset only. Local unmodified-runtime visual/motion/interaction and actual startup/network validation are required before selecting it for production.",
    meshes,
  }
  return { buffer, gzip, brotli, manifest }
}

async function readRegularFile(file) {
  const stat = await lstat(file)
  assert.ok(stat.isFile() && !stat.isSymbolicLink(), `Refusing non-regular file: ${file}`)
  return readFile(file)
}

export async function prepareBakedRobotScene({ write = false } = {}) {
  const source = await readRegularFile(sourceFile)
  const { buffer, gzip, brotli, manifest } = await buildBakedRobotScene(source)
  for (const [relative, contents] of [[OUTPUT_PATH, buffer], [GZIP_PATH, gzip], [BROTLI_PATH, brotli], [MANIFEST_PATH, Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`)]]) {
    const file = path.join(root, relative)
    let existing
    try { existing = await readRegularFile(file) } catch (error) { if (error.code !== "ENOENT") throw error }
    if (existing) assert.ok(existing.equals(contents), `Refusing to overwrite ${relative}; review a new bake version`)
    else if (write) await writeFile(file, contents, { flag: "wx" })
    else throw new Error(`Missing ${relative}`)
  }
  assert.equal(sha256(await readRegularFile(sourceFile)), SOURCE_HASH)
  return manifest
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2)
    assert.ok(args.length === 1 && ["--write", "--check"].includes(args[0]), "Use --write or --check")
    const result = await prepareBakedRobotScene({ write: args[0] === "--write" })
    console.log(JSON.stringify({ output: result.output, comparison: result.comparison, meshes: result.meshes.length }))
  } catch (error) { console.error(`Robot geometry bake failed: ${error.message}`); process.exitCode = 1 }
}
