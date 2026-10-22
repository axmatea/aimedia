import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import sharp from "sharp"
import { parseArguments, validateMaster } from "../prepare-inner-system.mjs"

test("Inner System CLI rejects ambiguous arguments and master validation enforces approved media", () => {
  assert.deepEqual(parseArguments(["--movie=./reviewed.mkv", "--orbit-frame=12"]), { movie: "./reviewed.mkv", orbitFrame: 12 })
  for (const args of [["--overwrite"], ["--movie="], ["--orbit-frame=-1"], ["--orbit-frame=1.5"], ["--orbit-frame=4", "--orbit-frame=5"]]) assert.throws(() => parseArguments(args))
  const video = { codec_type: "video", width: 1920, height: 1080, avg_frame_rate: "24/1", nb_read_frames: "24" }
  const valid = { streams: [video], format: { duration: "1" } }
  assert.equal(validateMaster(valid).frameCount, 24)
  assert.throws(() => validateMaster({ ...valid, streams: [video, { codec_type: "audio" }] }), /silent/)
  assert.throws(() => validateMaster({ ...valid, streams: [{ ...video, width: 1280 }] }), /1920/)
  assert.throws(() => validateMaster({ ...valid, streams: [{ ...video, avg_frame_rate: "30/1" }] }), /24 fps/)
  assert.throws(() => validateMaster({ ...valid, streams: [{ ...video, nb_read_frames: "N\/A" }] }), /frame count/)
  assert.throws(() => validateMaster({ ...valid, format: { duration: "9" } }), /duration/)
})

const mediaToolsAvailable = ["ffmpeg", "ffprobe"].every(binary => spawnSync(binary, ["-version"], { stdio: "ignore" }).status === 0)
test("synthetic local fixture verifies exact frame derivatives, accurate metadata and immutable output", { skip: !mediaToolsAvailable }, async () => {
  const root = await mkdtemp(path.join(tmpdir(), "ax-inner-system-test-"))
  const movie = path.join(root, "fixture.mkv")
  const script = fileURLToPath(new URL("../prepare-inner-system.mjs", import.meta.url))
  try {
    const fixture = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-n", "-f", "lavfi", "-i", "testsrc2=size=1920x1080:rate=24:duration=0.25", "-an", "-c:v", "ffv1", movie], { encoding: "utf8" })
    assert.equal(fixture.status, 0, fixture.stderr)
    const result = spawnSync(process.execPath, [script, `--movie=${movie}`, "--orbit-frame=3"], { cwd: root, encoding: "utf8", maxBuffer: 1024 * 1024 })
    assert.equal(result.status, 0, result.stderr)
    const target = path.join(root, "public/animated/inner-system-v1")
    const summary = JSON.parse(await readFile(path.join(target, "delivery.json"), "utf8"))
    assert.equal(summary.frameCount, 6)
    assert.equal(summary.fps, 24)
    assert.equal(summary.source.audioStreams, 0)
    assert.equal(summary.duration, .25)
    assert.deepEqual(summary.posterFrames, { entity: 0, orchestration: 3, workflow: 5 })
    for (const variant of ["desktop", "mobile"]) {
      const directory = path.join(target, "frames", variant)
      const files = (await readdir(directory)).sort()
      assert.deepEqual(files, ["0000.webp", "0001.webp", "0002.webp", "0003.webp", "0004.webp", "0005.webp"])
      const bytes = (await Promise.all(files.map(async file => (await stat(path.join(directory, file))).size))).reduce((a, b) => a + b, 0)
      assert.equal(summary[variant].bytes, bytes)
      const metadata = await sharp(path.join(directory, files[0])).metadata()
      assert.equal(metadata.width, summary[variant].width)
      assert.equal(metadata.height, summary[variant].height)
    }
    const posterPixels = []
    for (const name of ["entity", "orchestration", "workflow"]) {
      const metadata = await sharp(path.join(target, `${name}.webp`)).metadata()
      assert.equal(metadata.width, 1920)
      assert.equal(metadata.height, 1080)
      const mobile = await sharp(path.join(target, `${name}-mobile.webp`)).metadata()
      assert.equal(mobile.width, 768)
      assert.equal(mobile.height, 432)
      posterPixels.push(await readFile(path.join(target, `${name}.webp`)))
    }
    assert.notDeepEqual(posterPixels[0], posterPixels[1], "Posters must come from their selected real frames")
    assert.notDeepEqual(posterPixels[1], posterPixels[2])
    assert.ok((await stat(path.join(root, "artifacts/animated-experience/inner-system-source/inner-system-review.mp4"))).isFile())
    assert.ok(!(await readdir(target)).some(file => /\.mp4$|master|source|generation/.test(file)))
    const before = await readFile(path.join(target, "delivery.json"))
    const second = spawnSync(process.execPath, [script, `--movie=${movie}`, "--orbit-frame=3"], { cwd: root, encoding: "utf8" })
    assert.notEqual(second.status, 0)
    assert.match(second.stderr, /already exists; refusing to overwrite/)
    assert.deepEqual(await readFile(path.join(target, "delivery.json")), before)
    assert.ok((await stat(movie)).isFile(), "Input master must remain untouched")
  } finally { await rm(root, { recursive: true, force: true }) }
})
