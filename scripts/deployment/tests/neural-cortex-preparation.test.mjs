import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import sharp from "sharp"
import { extractPosterFrame, validateMaster } from "../prepare-inner-system.mjs"
import { parseCortexArguments } from "../prepare-neural-cortex.mjs"

test("Neural Cortex accepts only its own movie/brain flags and CFR seeking requires every frame timestamp", () => {
  assert.deepEqual(parseCortexArguments(["--movie=./reviewed.mkv", "--brain-frame=3"]), { movie: "./reviewed.mkv", brainFrame: 3 })
  for (const args of [["--orbit-frame=3"], ["--brain-frame=-1"], ["--brain-frame=1.5"], ["--brain-frame=3", "--brain-frame=4"]]) assert.throws(() => parseCortexArguments(args))
  const metadata = { streams: [{ codec_type: "video", width: 1920, height: 1080, avg_frame_rate: "24/1", nb_read_frames: "6" }], format: { duration: ".25" } }
  assert.equal(validateMaster(metadata).timestampSeeking, false, "Absent timestamp evidence keeps exact frame selection")
  metadata.frames = Array.from({ length: 6 }, (_, index) => ({ best_effort_timestamp_time: String(Math.round(index / 24 * 1000) / 1000) }))
  assert.equal(validateMaster(metadata).timestampSeeking, true)
  metadata.frames[3].best_effort_timestamp_time = ".14"
  assert.equal(validateMaster(metadata).timestampSeeking, false, "Irregular frame timing must not use timestamp indexing")
})

const mediaToolsAvailable = ["ffmpeg", "ffprobe"].every(binary => spawnSync(binary, ["-version"], { stdio: "ignore" }).status === 0)
test("accurate input seeking matches exact index-selected pixels for FFV1 and inter-frame H264 fixtures", { skip: !mediaToolsAvailable }, async () => {
  const root = await mkdtemp(path.join(tmpdir(), "ax-cortex-seek-test-"))
  try {
    for (const codec of ["ffv1", "libx264"]) {
      const movie = path.join(root, `fixture-${codec}.${codec === "ffv1" ? "mkv" : "mp4"}`)
      const fixture = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-n", "-f", "lavfi", "-i", "testsrc2=size=1920x1080:rate=24:duration=1", "-an", ...(codec === "ffv1" ? ["-vf", "format=yuv444p10le"] : []), "-c:v", codec, ...(codec === "libx264" ? ["-preset", "ultrafast", "-crf", "20", "-g", "24"] : []), movie], { encoding: "utf8" })
      assert.equal(fixture.status, 0, fixture.stderr)
      for (const index of [0, 1, 2, 3, 5, 8, 11, 17, 23]) {
        const seek = extractPosterFrame(movie, index, { timestampSeeking: true })
        const reference = extractPosterFrame(movie, index)
        const [selected, expected] = await Promise.all([sharp(seek).raw().toBuffer({ resolveWithObject: true }), sharp(reference).raw().toBuffer({ resolveWithObject: true })])
        assert.equal(selected.info.width, 1920, "No poster enlargement")
        assert.equal(selected.info.height, 1080)
        assert.deepEqual(selected.data, expected.data, `${codec} frame ${index}: input seek must match exact index selection pixel-for-pixel`)
      }
    }
  } finally { await rm(root, { recursive: true, force: true }) }
})

test("Neural Cortex wrapper creates only its own immutable derivatives and keeps the review ignored", { skip: !mediaToolsAvailable }, async () => {
  const root = await mkdtemp(path.join(tmpdir(), "ax-cortex-pipeline-test-"))
  const movie = path.join(root, "fixture.mkv")
  const script = fileURLToPath(new URL("../prepare-neural-cortex.mjs", import.meta.url))
  try {
    const fixture = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-n", "-f", "lavfi", "-i", "testsrc2=size=1920x1080:rate=24:duration=0.25", "-an", "-c:v", "ffv1", movie], { encoding: "utf8" })
    assert.equal(fixture.status, 0, fixture.stderr)
    const result = spawnSync(process.execPath, [script, `--movie=${movie}`, "--brain-frame=3"], { cwd: root, encoding: "utf8" })
    assert.equal(result.status, 0, result.stderr)
    const target = path.join(root, "public/animated/neural-cortex-v1")
    const summary = JSON.parse(await readFile(path.join(target, "delivery.json"), "utf8"))
    assert.equal(summary.frameCount, 6)
    assert.deepEqual(summary.posterFrames, { entity: 0, brain: 3, signals: 5 })
    for (const variant of ["desktop", "mobile"]) {
      const directory = path.join(target, "frames", variant)
      const frames = await readdir(directory)
      assert.equal(frames.length, 6)
      const bytes = (await Promise.all(frames.map(async name => (await stat(path.join(directory, name))).size))).reduce((sum, value) => sum + value, 0)
      assert.equal(summary[variant].bytes, bytes)
    }
    for (const name of ["entity", "brain", "signals"]) {
      assert.equal((await sharp(path.join(target, `${name}.webp`)).metadata()).width, 1920)
      assert.equal((await sharp(path.join(target, `${name}-mobile.webp`)).metadata()).width, 768)
    }
    assert.ok((await stat(path.join(root, "artifacts/animated-experience/neural-cortex-source/neural-cortex-review.mp4"))).isFile())
    assert.deepEqual((await readdir(path.join(root, "public/animated"))).sort(), ["neural-cortex-v1"])
    const repeat = spawnSync(process.execPath, [script, `--movie=${movie}`, "--brain-frame=3"], { cwd: root, encoding: "utf8" })
    assert.notEqual(repeat.status, 0)
    assert.match(repeat.stderr, /refusing to overwrite/)
    assert.ok((await stat(movie)).isFile())
  } finally { await rm(root, { recursive: true, force: true }) }
})
