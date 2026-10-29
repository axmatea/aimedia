import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { lstat, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

export const manifest = JSON.parse(await readFile(new URL("./robot-scene-optimization.json", import.meta.url), "utf8"))
const rootDirectory = fileURLToPath(new URL("../../", import.meta.url))
const sourceHash = "4e31d7ef0b54fd02e2dd373f18f89c32003ce6d9220a996e09c94efa4c7c31f9"
const outputHash = "2937966ae88b97a5386f78e124737713303330307c47a02e3f7b3cc1f8061fd1"
const sourcePath = "public/spline/robot.splinecode"
const outputPath = "public/spline/robot-optimized-v1.splinecode"
const markerOffset = 60199
const payloadOffset = 60204
const sourcePayloadBytes = 742479
const outputPayloadBytes = 404068
const sourceEnd = payloadOffset + sourcePayloadBytes
const outputEnd = payloadOffset + outputPayloadBytes
export const sha256 = value => createHash("sha256").update(value).digest("hex")

function validateManifest() {
  assert.equal(manifest.source.path, sourcePath)
  assert.equal(manifest.source.sha256, sourceHash)
  assert.equal(manifest.output.path, outputPath)
  assert.equal(manifest.output.sha256, outputHash)
  assert.equal(manifest.replacement.bin32MarkerOffset, markerOffset)
  assert.equal(manifest.replacement.payloadOffset, payloadOffset)
  assert.equal(manifest.replacement.sourceBytes, sourcePayloadBytes)
  assert.equal(manifest.replacement.outputBytes, outputPayloadBytes)
  assert.deepEqual(manifest.encoder.options, { lossless: true, effort: 6 })
}

export function validateSourceScene(source) {
  validateManifest()
  assert.equal(sha256(source), sourceHash, "Source scene changed; review it and create a new versioned export, never overwrite v1")
  assert.equal(source.length, manifest.source.bytes)
  assert.equal(source.subarray(markerOffset, payloadOffset).toString("hex"), manifest.replacement.sourceHeaderHex)
  assert.equal(source.readUInt32BE(markerOffset + 1), sourcePayloadBytes)
  const png = source.subarray(payloadOffset, sourceEnd)
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a")
  assert.equal(sha256(png), manifest.replacement.sourceSha256)
  return png
}

async function decodeTexture(image, format) {
  const metadata = await sharp(image).metadata()
  assert.equal(metadata.format, format)
  assert.equal(metadata.width, manifest.decodedPixels.width)
  assert.equal(metadata.height, manifest.decodedPixels.height)
  assert.equal(metadata.space, manifest.decodedPixels.colourspace)
  assert.equal(metadata.depth, manifest.decodedPixels.depth)
  assert.equal(metadata.hasProfile, false)
  assert.equal(metadata.icc, undefined)
  assert.equal(metadata.exif, undefined)
  const { data, info } = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  assert.equal(info.width, manifest.decodedPixels.width)
  assert.equal(info.height, manifest.decodedPixels.height)
  assert.equal(info.channels, manifest.decodedPixels.channels)
  assert.equal(info.depth, manifest.decodedPixels.depth)
  assert.equal(data.length, manifest.decodedPixels.bytes)
  assert.equal(sha256(data), manifest.decodedPixels.sha256, "Decoded texture pixels must remain bit-identical")
  return data
}

export async function verifyOptimizedRobotScene(source, output) {
  const png = validateSourceScene(source)
  assert.equal(output.length, manifest.output.bytes)
  assert.equal(sha256(output), outputHash, "Derived scene is not the reviewed v1 asset")
  assert.equal(output.subarray(markerOffset, payloadOffset).toString("hex"), manifest.replacement.outputHeaderHex)
  assert.equal(output.readUInt32BE(markerOffset + 1), outputPayloadBytes)
  // The marker stays intact. Only its four-byte length and image bytes change.
  assert.ok(source.subarray(0, markerOffset + 1).equals(output.subarray(0, markerOffset + 1)), "Scene prefix changed")
  assert.ok(source.subarray(sourceEnd).equals(output.subarray(outputEnd)), "Scene suffix changed")
  const webp = output.subarray(payloadOffset, outputEnd)
  assert.equal(sha256(webp), manifest.replacement.outputSha256)
  assert.equal(webp.toString("ascii", 0, 4), "RIFF")
  assert.equal(webp.readUInt32LE(4) + 8, webp.length)
  assert.equal(webp.toString("ascii", 8, 12), "WEBP")
  assert.equal(webp.toString("ascii", 12, 16), "VP8L", "Texture must use lossless WebP")
  const [sourcePixels, outputPixels] = await Promise.all([decodeTexture(png, "png"), decodeTexture(webp, "webp")])
  assert.ok(sourcePixels.equals(outputPixels), "Texture RGBA bytes changed")
  return { sourceBytes: source.length, outputBytes: output.length, bytesSaved: source.length - output.length }
}

// Offline only: sharp is already installed through Next. There is no resizing,
// scene parse/re-export, scene setting change, runtime transform or network I/O.
export async function buildOptimizedRobotScene(source) {
  const png = validateSourceScene(source)
  const webp = await sharp(png).webp({ lossless: true, effort: 6 }).toBuffer()
  assert.equal(webp.length, outputPayloadBytes)
  assert.equal(sha256(webp), manifest.replacement.outputSha256, "Encoder result changed; review a new versioned export instead")
  const length = Buffer.alloc(4)
  length.writeUInt32BE(webp.length)
  const output = Buffer.concat([source.subarray(0, markerOffset + 1), length, webp, source.subarray(sourceEnd)])
  await verifyOptimizedRobotScene(source, output)
  return output
}

async function readRegularFile(file, { optional = false } = {}) {
  try {
    const info = await lstat(file)
    assert.ok(info.isFile() && !info.isSymbolicLink(), `Refusing non-regular file: ${file}`)
    return await readFile(file)
  } catch (error) {
    if (optional && error.code === "ENOENT") return null
    throw error
  }
}

export async function prepareOptimizedRobotScene({ root = rootDirectory, write = false } = {}) {
  const originalFile = path.join(root, sourcePath)
  const targetFile = path.join(root, outputPath)
  const source = await readRegularFile(originalFile)
  const output = write ? await buildOptimizedRobotScene(source) : await readRegularFile(targetFile)
  const comparison = await verifyOptimizedRobotScene(source, output)
  let status = "verified"
  if (write) {
    const existing = await readRegularFile(targetFile, { optional: true })
    if (existing) {
      assert.ok(existing.equals(output), `Refusing to overwrite ${outputPath}; create a new versioned export`)
      status = "unchanged"
    } else {
      // Exclusive creation also refuses a file created after the preflight.
      await writeFile(targetFile, output, { flag: "wx" })
      status = "created"
    }
  }
  // Read back both files so the generator cannot silently mutate the original.
  assert.equal(sha256(await readRegularFile(originalFile)), sourceHash)
  assert.ok((await readRegularFile(targetFile)).equals(output))
  return { status, source: sourcePath, output: outputPath, ...comparison, sha256: outputHash }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2)
    if (args.length !== 1 || !["--write", "--check", "--help"].includes(args[0])) throw new Error("Use --write, --check or --help")
    if (args[0] === "--help") console.log("Usage: node scripts/deployment/optimize-robot-scene.mjs --write|--check\nOffline lossless v1 export. Changed sources and unrelated existing outputs are refused; create a reviewed new version instead.")
    else console.log(JSON.stringify(await prepareOptimizedRobotScene({ write: args[0] === "--write" })))
  } catch (error) {
    console.error(`Robot scene optimization failed: ${error.message}`)
    process.exitCode = 1
  }
}
