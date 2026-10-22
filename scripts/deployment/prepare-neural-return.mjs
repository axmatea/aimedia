import { spawnSync } from "node:child_process"
import { mkdtemp, mkdir, readdir, readFile, writeFile, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import sharp from "sharp"

// Delivery derivatives of verified Higgsfield masters, never substitute footage.
// Masters remain ignored; the same source and settings reproduce public assets.
const root = process.cwd()
const source = path.join(root, "artifacts/animated-experience/neural-return-source")
const target = path.join(root, "public/animated/neural-return")
const movie = path.join(source, "neural-return-master.mp4")
const framesRoot = path.join(target, "frames")
// Check before any poster writes, so a repeat cannot replace reviewed film stills.
try { await stat(framesRoot); throw new Error("Frame derivatives already exist; refusing to overwrite reviewed assets.") }
catch (error) { if (error.code !== "ENOENT") throw error }
await mkdir(target, { recursive: true })
for (const name of ["entity", "orchestration", "workflow"]) {
  await sharp(path.join(source, `${name}-master.png`))
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 86, effort: 6 })
    .toFile(path.join(target, `${name}.webp`))
  await sharp(path.join(source, `${name}-master.png`))
    .resize({ width: 768, withoutEnlargement: true })
    .webp({ quality: 80, effort: 6 })
    .toFile(path.join(target, `${name}-mobile.webp`))
}
if (process.argv.includes("--posters-only")) {
  console.log("Prepared three optimized keyframe posters; no movie encoding requested.")
  process.exit(0)
}
const probe = spawnSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", movie], { encoding: "utf8" })
if (probe.status !== 0) throw new Error("A downloaded and verified video master is required.")
const metadata = JSON.parse(probe.stdout)
const video = metadata.streams.find((stream) => stream.codec_type === "video")
if (!video || video.width < 1920 || video.height < 1080) throw new Error("Master below the approved 1080p source resolution.")
const fps = 24
const duration = Number(metadata.format.duration)
if (!(duration >= 16 && duration <= 30)) throw new Error("Unexpected master duration; review it before preparing delivery assets.")
const temporary = await mkdtemp(path.join(tmpdir(), "ax-neural-return-"))
await mkdir(path.join(framesRoot, "desktop"), { recursive: true })
await mkdir(path.join(framesRoot, "mobile"), { recursive: true })
try {
  const extracted = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", movie, "-an", "-vf", `fps=${fps},scale=1280:720:flags=lanczos`, "-start_number", "0", path.join(temporary, "%04d.png")], { encoding: "utf8" })
  if (extracted.status !== 0) throw new Error(extracted.stderr)
  const frames = (await readdir(temporary)).filter((name) => name.endsWith(".png")).sort()
  const summary = { fps, duration, frameCount: frames.length, desktop: { width: 1280, height: 720, bytes: 0 }, mobile: { width: 768, height: 432, bytes: 0 }, source: { width: video.width, height: video.height, audioStreams: metadata.streams.filter((stream) => stream.codec_type === "audio").length } }
  for (let first = 0; first < frames.length; first += 4) {
    await Promise.all(frames.slice(first, first + 4).map(async (name) => {
      const input = await readFile(path.join(temporary, name))
      const desktop = await sharp(input).webp({ quality: 81, effort: 5 }).toBuffer()
      const mobile = await sharp(input).resize({ width: 768 }).webp({ quality: 77, effort: 5 }).toBuffer()
      const output = name.replace(/\.png$/, ".webp")
      await Promise.all([writeFile(path.join(framesRoot, "desktop", output), desktop), writeFile(path.join(framesRoot, "mobile", output), mobile)])
      summary.desktop.bytes += desktop.length
      summary.mobile.bytes += mobile.length
    }))
  }
  // Linear review copy is not loaded by the scroll player.
  const review = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-n", "-i", movie, "-an", "-vf", "scale=1280:720:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p", "-movflags", "+faststart", path.join(target, "review.mp4")], { encoding: "utf8" })
  if (review.status !== 0) throw new Error(review.stderr)
  // Use actual film frames for first paint/reduced motion, avoiding a reference-to-film pop.
  for (const [name, seconds] of [["entity", 0], ["orchestration", 10], ["workflow", 20]]) {
    const still = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-ss", String(seconds), "-i", movie, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "pipe:1"], { maxBuffer: 32 * 1024 * 1024 })
    if (still.status !== 0) throw new Error("Could not extract an exact film poster.")
    await sharp(still.stdout).webp({ quality: 86, effort: 6 }).toFile(path.join(target, `${name}.webp`))
    await sharp(still.stdout).resize({ width: 768 }).webp({ quality: 80, effort: 6 }).toFile(path.join(target, `${name}-mobile.webp`))
  }
  await writeFile(path.join(target, "delivery.json"), `${JSON.stringify(summary, null, 2)}\n`)
  console.log(JSON.stringify(summary))
} finally {
  await rm(temporary, { recursive: true, force: true })
}
