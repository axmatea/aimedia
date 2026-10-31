import { Application } from "@splinetool/runtime"

const byId = id => document.getElementById(id)
const stage = byId("stage"), status = byId("status"), result = byId("result")
let app = null, selected = null, busy = false, config = null
const snapshots = {}
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right)
const bytesOf = array => new Uint8Array(array.buffer, array.byteOffset, array.byteLength)
const hash = async bytes => [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map(value => value.toString(16).padStart(2, "0")).join("")

function activity(message, loading = busy) {
  status.textContent = message
  document.body.dataset.reviewState = loading ? "loading" : "ready"
  for (const id of ["baseline", "baked", "compare", "layout"]) byId(id).disabled = loading
  for (const id of ["pause", "play", "snapshot"]) byId(id).disabled = loading || !app
}

function display(value) {
  result.textContent = JSON.stringify(value, null, 2)
  const compact = value.error ? { error: value.error, stack: value.stack } : {
    version: value.version,
    assetSHA256: value.source?.sha256,
    stopped: value.stopped,
    meshCount: value.meshes?.length,
    meshChecksPassed: value.comparedMeshes ? value.meshes.filter(mesh => mesh.passed).length : undefined,
    sameViewport: value.sameViewport,
    sameCamera: value.sameCamera,
    checks: value.comparedMeshes ? Object.fromEntries(Object.keys(value.meshes[0]?.checks ?? {}).map(key => [key, `${value.meshes.filter(mesh => mesh.checks?.[key]).length}/${value.meshes.length}`])) : undefined,
  }
  byId("summary").textContent = JSON.stringify(compact, null, 2)
}

async function bufferInfo(array) {
  if (!array || !ArrayBuffer.isView(array)) return null
  return { type: array.constructor.name, length: array.length, bytes: array.byteLength, sha256: await hash(bytesOf(array)) }
}

async function describeAttribute(attribute) {
  if (!attribute) return null
  const array = attribute.array ?? attribute.data?.array
  return { ...(await bufferInfo(array)), count: attribute.count, itemSize: attribute.itemSize, normalized: attribute.normalized, stride: attribute.data?.stride ?? null, offset: attribute.offset ?? 0 }
}

async function summarize(value, depth = 0) {
  if (value === undefined || value === null) return null
  if (ArrayBuffer.isView(value)) return bufferInfo(value)
  if (typeof value !== "object") return typeof value === "function" ? "[function]" : value
  if (depth > 5) return "[bounded]"
  if (Array.isArray(value)) return value.length <= 64 ? Promise.all(value.map(item => summarize(item, depth + 1))) : { length: value.length }
  const output = {}
  for (const key of Object.keys(value).sort().slice(0, 64)) output[key] = await summarize(value[key], depth + 1)
  return output
}

function matrix(value) { return value?.elements ? Array.from(value.elements) : null }
function vector(value, components) { return value ? components.map(key => value[key]) : null }

async function expandedAttribute(attribute, index) {
  if (!attribute) return null
  const count = index?.count ?? attribute.count
  if (!Number.isSafeInteger(count) || count < 1 || count > 5_000_000 || attribute.itemSize !== 3) throw new Error("Unexpected triangle attribute shape")
  const expanded = new Float32Array(count * 3)
  for (let offset = 0; offset < count; offset++) {
    const vertex = index ? index.getX(offset) : offset
    expanded[offset * 3] = attribute.getX(vertex)
    expanded[offset * 3 + 1] = attribute.getY(vertex)
    expanded[offset * 3 + 2] = attribute.getZ(vertex)
  }
  return bufferInfo(expanded)
}

async function snapshot() {
  if (!app || !config) throw new Error("Load a scene first")
  const scene = app._scene
  if (!scene || typeof scene.getObjectByProperty !== "function") throw new Error("Installed runtime no longer exposes the reviewed real Object3D scene")
  let sceneMeshes = 0
  const materialIds = new Set()
  scene.traverse(object => {
    if (object.geometry) sceneMeshes++
    const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : []
    for (const material of materials) materialIds.add(material.uuid ?? material)
  })
  const meshes = []
  for (const expected of config.meshes) {
    const object = scene.getObjectByProperty("uuid", expected.id)
    if (!object) { meshes.push({ id: expected.id, missing: true }); continue }
    const geometry = object.geometry
    const position = geometry?.getAttribute?.("position"), normal = geometry?.getAttribute?.("normal"), index = geometry?.index
    const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : []
    const buffers = { position: await describeAttribute(position), normal: await describeAttribute(normal), index: await describeAttribute(index) }
    meshes.push({
      id: expected.id, name: object.name, geometryType: geometry?.type ?? null,
      buffers, expanded: { position: await expandedAttribute(position, index), normal: await expandedAttribute(normal, index) },
      parameters: await summarize(geometry?.userData?.parameters), geometryParameters: await summarize(geometry?.parameters),
      matrices: { matrixWorld: matrix(object.matrixWorld), hiddenMatrix: matrix(object.hiddenMatrix), pivotMatrix: matrix(object.pivotMatrix), matrix: matrix(object.matrix) },
      transforms: { position: vector(object.position, ["x", "y", "z"]), quaternion: vector(object.quaternion, ["x", "y", "z", "w"]), scale: vector(object.scale, ["x", "y", "z"]), visible: object.visible },
      materials: { count: materials.length, arrayShape: Array.isArray(object.material), descriptors: materials.map(material => ({ type: material.type, name: material.name, visible: material.visible, opacity: material.opacity, transparent: material.transparent, side: material.side })) },
      candidateRawBuffersMatchManifest: selected === "baked" ? Object.fromEntries(["position", "normal", "index"].map(key => [key, buffers[key]?.sha256 === expected.buffers[key].sha256 && buffers[key]?.bytes === expected.buffers[key].bytes])) : null,
    })
  }
  const camera = app._camera
  return {
    version: selected, source: config.versions[selected], posePolicy: "Stopped immediately after app.load; runtime and animation clock unmodified",
    stopped: app.isStopped, layout: stage.dataset.layout, viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, canvasWidth: app.canvas.width, canvasHeight: app.canvas.height, stageWidth: stage.clientWidth, stageHeight: stage.clientHeight },
    camera: camera ? { type: camera.type, matrix: matrix(camera.matrix), matrixWorld: matrix(camera.matrixWorld), projectionMatrix: matrix(camera.projectionMatrix) } : null,
    inventory: { sceneMeshes, uniqueMaterials: materialIds.size }, meshes,
  }
}

async function load(kind) {
  const response = await fetch("/review-config.json", { cache: "no-store", credentials: "omit" })
  if (!response.ok) throw new Error("Reviewed assets or bake manifest are not ready")
  config = await response.json()
  if (config.versions.baseline.sha256 !== config.expectedSource || config.versions.baked.sha256 !== config.expectedBaked) throw new Error("Asset hashes differ from the bake manifest; regenerate/review first")
  app?.dispose()
  app = null
  const canvas = document.createElement("canvas")
  stage.replaceChildren(canvas)
  selected = kind
  activity(`Loading ${kind} with the installed, unmodified runtime…`, true)
  const next = new Application(canvas, { wasmPath: "/spline" })
  try {
    await next.load(config.versions[kind].url, undefined, { cache: "no-store", credentials: "omit" })
    next.stop()
    app = next
    snapshots[kind] = await snapshot()
    display(snapshots[kind])
    return snapshots[kind]
  } catch (error) { next.dispose(); throw error }
}

function compare(baseline, baked) {
  const meshes = config.meshes.map(({ id }) => {
    const a = baseline.meshes.find(mesh => mesh.id === id), b = baked.meshes.find(mesh => mesh.id === id)
    if (a?.missing || b?.missing) return { id, missing: true, passed: false }
    const checks = {
      trianglePositions: equal(a.expanded.position, b.expanded.position), triangleNormals: equal(a.expanded.normal, b.expanded.normal),
      matrices: equal(a.matrices, b.matrices), transforms: equal(a.transforms, b.transforms), materialCount: a.materials.count === b.materials.count,
      materialDescriptors: equal(a.materials.descriptors, b.materials.descriptors),
      candidateRawBuffers: Object.values(b.candidateRawBuffersMatchManifest).every(Boolean),
    }
    return { id, name: b.name, checks, passed: Object.values(checks).every(Boolean) }
  })
  return { passed: meshes.every(mesh => mesh.passed), comparedMeshes: meshes.length, sameViewport: equal(baseline.viewport, baked.viewport), sameCamera: equal(baseline.camera, baked.camera), meshes, baseline, baked }
}

async function action(callback) {
  if (busy) return
  busy = true
  activity("Working…", true)
  try { await callback() } catch (error) { display({ error: error.message, stack: error.stack ?? null }); activity(`Review failed: ${error.message}`, false) }
  finally { busy = false; activity(status.textContent, false) }
}

for (const kind of ["baseline", "baked"]) byId(kind).addEventListener("click", () => action(async () => {
  await load(kind)
  activity(`${kind} loaded and paused. Snapshot contains all eight real runtime meshes.`, false)
}))
byId("compare").addEventListener("click", () => action(async () => {
  const baseline = await load("baseline"), baked = await load("baked")
  const comparison = compare(baseline, baked)
  display(comparison)
  activity(`Initial-pose comparison: ${comparison.passed ? "PASS" : "DIFFERENCES"}. ${comparison.meshes.filter(mesh => mesh.passed).length}/8 meshes pass. Baked scene remains paused.`, false)
}))
byId("snapshot").addEventListener("click", () => action(async () => {
  app.stop()
  snapshots[selected] = await snapshot()
  display(snapshots[selected])
  activity(`${selected} paused and captured read-only.`, false)
}))
byId("pause").addEventListener("click", () => { app?.stop(); activity(`${selected} paused.`, false) })
byId("play").addEventListener("click", () => { app?.play(); activity(`${selected} playing the original authored animation.`, false) })
byId("theme").addEventListener("click", () => {
  document.body.dataset.theme = document.body.dataset.theme === "dark" ? "light" : "dark"
  byId("theme").textContent = document.body.dataset.theme === "dark" ? "Light background" : "Dark background"
})
byId("layout").addEventListener("change", event => { stage.dataset.layout = event.target.value })
byId("hide-panel").addEventListener("click", () => { document.body.dataset.panel = "hidden" })
byId("show-panel").addEventListener("click", () => { document.body.dataset.panel = "visible" })
window.addEventListener("pagehide", () => app?.dispose(), { once: true })
