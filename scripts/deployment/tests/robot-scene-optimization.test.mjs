import assert from "node:assert/strict"
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import { gzipSync } from "node:zlib"
import sharp from "sharp"
import { buildOptimizedRobotScene, manifest, prepareOptimizedRobotScene, sha256, validateSourceScene, verifyOptimizedRobotScene } from "../optimize-robot-scene.mjs"

const root = new URL("../../../", import.meta.url)
const source = await readFile(new URL("public/spline/robot.splinecode", root))
const output = await readFile(new URL("public/spline/robot-optimized-v1.splinecode", root))
const sourceHash = "4e31d7ef0b54fd02e2dd373f18f89c32003ce6d9220a996e09c94efa4c7c31f9"
const pixelHash = "fc1e8ad3703f12cf4a782c06e531187699c701b6c74a21ad434a4c09b3a20fc7"
const texture = buffer => buffer.subarray(60204, 60204 + buffer.readUInt32BE(60200))

test("the original robot source and exact scene bytes outside one image block are preserved", async () => {
  assert.equal(source.length, 1349622)
  assert.equal(sha256(source), sourceHash)
  assert.equal(source.subarray(60199, 60204).toString("hex"), "c6000b544f")
  assert.equal(output.subarray(60199, 60204).toString("hex"), "c600062a64")
  assert.deepEqual(output.subarray(0, 60200), source.subarray(0, 60200))
  assert.deepEqual(output.subarray(464272), source.subarray(802683))
  assert.deepEqual(await verifyOptimizedRobotScene(source, output), {
    sourceBytes: 1349622, outputBytes: 1011211, bytesSaved: 338411,
  })
  assert.equal(sha256(await readFile(new URL(manifest.source.path, root))), sourceHash)
})

test("lossless WebP preserves all 16 MB decoded RGBA bytes, colourspace and dimensions", async () => {
  const originalImage = texture(source)
  const generatedImage = texture(output)
  assert.equal(originalImage.subarray(0, 8).toString("hex"), "89504e470d0a1a0a")
  assert.equal(generatedImage.toString("ascii", 0, 4), "RIFF")
  assert.equal(generatedImage.toString("ascii", 8, 16), "WEBPVP8L")
  assert.equal(generatedImage.readUInt32LE(4) + 8, generatedImage.length)
  const pixels = []
  for (const [image, format] of [[originalImage, "png"], [generatedImage, "webp"]]) {
    const metadata = await sharp(image).metadata()
    assert.equal(metadata.format, format)
    assert.equal(metadata.width, 2000)
    assert.equal(metadata.height, 2000)
    assert.equal(metadata.space, "srgb")
    assert.equal(metadata.depth, "uchar")
    assert.equal(metadata.hasProfile, false)
    assert.equal(metadata.icc, undefined)
    assert.equal(metadata.exif, undefined)
    const { data, info } = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    assert.equal(info.channels, 4)
    assert.equal(data.length, 16000000)
    assert.equal(sha256(data), pixelHash)
    pixels.push(data)
  }
  assert.ok(pixels[0].equals(pixels[1]))
})

test("the offline encoder reproduces the exact reviewed versioned asset", async () => {
  const generated = await buildOptimizedRobotScene(source)
  assert.ok(generated.equals(output))
  assert.equal(generated.length, 1011211)
  assert.equal(texture(generated).length, 404068)
  assert.equal(sha256(generated), "2937966ae88b97a5386f78e124737713303330307c47a02e3f7b3cc1f8061fd1")
  assert.equal(sha256(source), sourceHash)
})

test("manifest savings are exact raw totals and an explicitly labelled gzip level-9 comparison", () => {
  assert.equal(manifest.comparison.bytesSaved, source.length - output.length)
  assert.equal(manifest.comparison.bytesSaved, 338411)
  const originalGzip = gzipSync(source, { level: 9 }).length
  const outputGzip = gzipSync(output, { level: 9 }).length
  // zlib versions may change gzip packing, so pin exact measurements only for
  // the recorded version and require a material saving on other toolchains.
  if (process.versions.zlib === manifest.comparison.gzip.zlib) {
    assert.equal(originalGzip, manifest.comparison.gzip.sourceBytes)
    assert.equal(outputGzip, manifest.comparison.gzip.outputBytes)
  }
  assert.equal(manifest.comparison.gzip.sourceBytes - manifest.comparison.gzip.outputBytes, 321336)
  assert.ok(outputGzip < originalGzip * 0.75)
})

test("changed source, image, length or scene-envelope bytes fail closed", async () => {
  for (const offset of [0, 60200, 60204, 802683, source.length - 1]) {
    const changed = Buffer.from(source)
    changed[offset] ^= 1
    assert.throws(() => validateSourceScene(changed), /Source scene changed/)
  }
  for (const offset of [0, 60200, 60204, 464272, output.length - 1]) {
    const changed = Buffer.from(output)
    changed[offset] ^= 1
    await assert.rejects(verifyOptimizedRobotScene(source, changed), /Derived scene is not the reviewed v1 asset/)
  }
})

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), "aimedia-robot-scene-"))
  t.after(() => rm(directory, { recursive: true, force: true }))
  await mkdir(path.join(directory, "public/spline"), { recursive: true })
  await writeFile(path.join(directory, manifest.source.path), source)
  return directory
}

test("generation exclusively creates v1, is idempotent, and never writes its source", async t => {
  const directory = await fixture(t)
  const first = await prepareOptimizedRobotScene({ root: directory, write: true })
  assert.equal(first.status, "created")
  assert.ok((await readFile(path.join(directory, manifest.output.path))).equals(output))
  assert.equal(sha256(await readFile(path.join(directory, manifest.source.path))), sourceHash)
  assert.equal((await prepareOptimizedRobotScene({ root: directory, write: true })).status, "unchanged")
  assert.equal((await prepareOptimizedRobotScene({ root: directory })).status, "verified")
})

test("generation refuses unrelated or changed versioned output without overwriting it", async t => {
  const directory = await fixture(t)
  const unrelated = Buffer.from("unrelated asset: must remain untouched")
  await writeFile(path.join(directory, manifest.output.path), unrelated)
  await assert.rejects(prepareOptimizedRobotScene({ root: directory, write: true }), /Refusing to overwrite/)
  assert.ok((await readFile(path.join(directory, manifest.output.path))).equals(unrelated))
  assert.equal(sha256(await readFile(path.join(directory, manifest.source.path))), sourceHash)
})

test("generation refuses a changed source before creating any output", async t => {
  const directory = await fixture(t)
  const changed = Buffer.from(source)
  changed[0] ^= 1
  await writeFile(path.join(directory, manifest.source.path), changed)
  await assert.rejects(prepareOptimizedRobotScene({ root: directory, write: true }), /Source scene changed/)
  await assert.rejects(readFile(path.join(directory, manifest.output.path)), { code: "ENOENT" })
  assert.ok((await readFile(path.join(directory, manifest.source.path))).equals(changed))
})

test("a symlink cannot redirect the versioned output write to another asset", async t => {
  const directory = await fixture(t)
  await symlink("robot.splinecode", path.join(directory, manifest.output.path))
  await assert.rejects(prepareOptimizedRobotScene({ root: directory, write: true }), /Refusing non-regular file/)
  assert.equal(sha256(await readFile(path.join(directory, manifest.source.path))), sourceHash)
})
