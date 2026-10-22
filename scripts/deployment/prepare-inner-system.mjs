import { spawnSync } from "node:child_process"
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const FPS = 24
const PUBLIC_ROOT = "public/animated/inner-system-v1"
const SOURCE_ROOT = "artifacts/animated-experience/inner-system-source"
const POSTER_NAMES = { entity: "entity", orchestration: "orchestration", workflow: "workflow" }

export function parseArguments(args) {
  const result = {}
  for (const arg of args) {
    if (arg === "--help") { result.help = true; continue }
    if (arg.startsWith("--movie=")) {
      if (result.movie !== undefined || !arg.slice(8)) throw new Error("Supply one nonempty --movie=<local path>.")
      result.movie = arg.slice(8)
    } else if (arg.startsWith("--orbit-frame=")) {
      const value = arg.slice(14)
      if (result.orbitFrame !== undefined || !/^\d+$/.test(value)) throw new Error("--orbit-frame must be a nonnegative frame index.")
      result.orbitFrame = Number(value)
      if (!Number.isSafeInteger(result.orbitFrame)) throw new Error("--orbit-frame is outside the supported integer range.")
    } else throw new Error(`Unknown argument: ${arg.split("=")[0]}`)
  }
  return result
}

export function validateMaster(metadata) {
  const videos = metadata.streams?.filter(stream => stream.codec_type === "video") ?? []
  const audioStreams = metadata.streams?.filter(stream => stream.codec_type === "audio").length ?? 0
  if (videos.length !== 1) throw new Error("The reviewed master must contain exactly one video stream.")
  if (audioStreams !== 0) throw new Error("The reviewed master must be silent; audio streams are not approved.")
  const video = videos[0]
  if (video.width !== 1920 || video.height !== 1080) throw new Error("The reviewed master must be exactly 1920×1080.")
  const [numerator, denominator = 1] = String(video.avg_frame_rate || video.r_frame_rate).split("/").map(Number)
  if (!Number.isFinite(numerator / denominator) || Math.abs(numerator / denominator - FPS) > .000001) throw new Error("The reviewed master must be exactly 24 fps.")
  const frameCount = Number(video.nb_read_frames ?? video.nb_frames)
  if (!Number.isSafeInteger(frameCount) || frameCount < 1 || frameCount > 10_000) throw new Error("ffprobe could not confirm a bounded exact frame count.")
  const duration = Number(video.duration ?? metadata.format?.duration)
  if (!Number.isFinite(duration) || duration <= 0 || Math.abs(duration - frameCount / FPS) > .1) throw new Error("Master duration disagrees with its confirmed 24 fps frame count.")
  // FFV1 Matroska timestamps may be quantized to milliseconds. Only optimize
  // seeking after every decoded frame confirms the expected 24 fps timeline.
  const times = metadata.frames?.map(frame => Number(frame.best_effort_timestamp_time)) ?? []
  const timestampSeeking = times.length === frameCount && times.every((time, index) => Number.isFinite(time) && Math.abs(time - times[0] - index / FPS) <= .001)
  return { width: video.width, height: video.height, fps: FPS, frameCount, duration, audioStreams, timestampSeeking }
}

async function requireAbsent(target, description) {
  try { await stat(target) } catch (error) { if (error.code === "ENOENT") return; throw error }
  throw new Error(`${description} already exists; refusing to overwrite reviewed material.`)
}

function command(binary, args, options = {}) {
  const result = spawnSync(binary, args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024, ...options })
  if (result.error) throw new Error(`${binary} is required and could not start.`)
  if (result.status !== 0) throw new Error(`${binary} failed: ${String(result.stderr ?? "").trim()}`)
  return result
}

export function extractPosterFrame(movie, index, { timestampSeeking = false } = {}) {
  const input = timestampSeeking ? ["-ss", String(index / FPS), "-i", movie] : ["-i", movie]
  const selection = timestampSeeking ? [] : ["-vf", `select=eq(n\\,${index})`]
  return command("ffmpeg", ["-hide_banner", "-loglevel", "error", ...input, "-map", "0:v:0", "-an", ...selection, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "pipe:1"], { encoding: "buffer" }).stdout
}

export async function prepareInnerSystem({ root = process.cwd(), movie, orbitFrame, sourceRoot = SOURCE_ROOT, targetRoot = PUBLIC_ROOT, posterNames = POSTER_NAMES, reviewName = "inner-system-review.mp4" } = {}) {
  const source = path.resolve(root, sourceRoot)
  const target = path.resolve(root, targetRoot)
  if (!source.startsWith(path.resolve(root, "artifacts/animated-experience") + path.sep)) throw new Error("Source derivatives must stay in the ignored cinematic source tree.")
  if (!target.startsWith(path.resolve(root, "public/animated") + path.sep)) throw new Error("Public derivatives must stay in the cinematic asset tree.")
  if (path.basename(reviewName) !== reviewName || !/^[a-z0-9-]+\.mp4$/.test(reviewName)) throw new Error("Review filename must be a plain MP4 filename inside the ignored source folder.")
  const names = [posterNames.entity, posterNames.orchestration, posterNames.workflow]
  if (new Set(names).size !== 3 || names.some(name => typeof name !== "string" || !/^[a-z0-9-]+$/.test(name))) throw new Error("Three unique plain poster filenames are required.")
  const input = path.resolve(root, movie ?? path.join(sourceRoot, "inner-system-master.mkv"))
  const review = path.join(source, reviewName)
  // Check all permanent destinations before probing or writing any derivatives.
  await requireAbsent(target, "Immutable public target")
  await requireAbsent(review, "Ignored linear review copy")
  if (!(await stat(input)).isFile()) throw new Error("A reviewed local movie master is required.")
  const probe = command("ffprobe", ["-v", "error", "-count_frames", "-show_streams", "-show_format", "-show_frames", "-show_entries", "stream=codec_type,width,height,avg_frame_rate,r_frame_rate,nb_read_frames,nb_frames,duration:format=duration:frame=best_effort_timestamp_time", "-of", "json", input])
  const master = validateMaster(JSON.parse(probe.stdout))
  const orbit = orbitFrame ?? Math.round((master.frameCount - 1) / 2)
  if (!Number.isSafeInteger(orbit) || orbit < 0 || orbit >= master.frameCount) throw new Error("The orchestration poster frame must exist in the reviewed master.")
  await mkdir(path.dirname(target), { recursive: true })
  await mkdir(source, { recursive: true })
  await mkdir(target) // Atomic reservation: a concurrent preparation cannot overwrite it.
  const framesRoot = path.join(target, "frames")
  await Promise.all(["desktop", "mobile"].map(variant => mkdir(path.join(framesRoot, variant), { recursive: true })))
  const temporary = await mkdtemp(path.join(tmpdir(), "ax-inner-system-frames-"))
  // Four frames at a time, with one libvips worker per frame and a small shared
  // cache. The full decoded movie is never retained in process memory.
  sharp.concurrency(1)
  sharp.cache({ memory: 32, files: 0, items: 16 })
  try {
    command("ffmpeg", ["-hide_banner", "-loglevel", "error", "-n", "-i", input, "-map", "0:v:0", "-an", "-vf", `fps=${FPS},scale=1280:720:flags=lanczos`, "-start_number", "0", path.join(temporary, "%04d.png")])
    const frames = (await readdir(temporary)).filter(name => /^\d{4}\.png$/.test(name)).sort()
    if (frames.length !== master.frameCount || frames.some((name, index) => name !== `${String(index).padStart(4, "0")}.png`)) throw new Error("Extracted frames disagree with the reviewed master; partial derivatives retained for inspection.")
    const summary = {
      fps: FPS,
      duration: master.duration,
      frameCount: frames.length,
      desktop: { width: 1280, height: 720, bytes: 0 },
      mobile: { width: 768, height: 432, bytes: 0 },
      source: { width: master.width, height: master.height, audioStreams: master.audioStreams },
      posterFrames: { [names[0]]: 0, [names[1]]: orbit, [names[2]]: master.frameCount - 1 },
    }
    for (let first = 0; first < frames.length; first += 4) {
      await Promise.all(frames.slice(first, first + 4).map(async name => {
        const inputFrame = await readFile(path.join(temporary, name))
        const desktop = await sharp(inputFrame).webp({ quality: 81, effort: 5 }).toBuffer()
        const mobile = await sharp(inputFrame).resize({ width: 768 }).webp({ quality: 77, effort: 5 }).toBuffer()
        const output = name.replace(/\.png$/, ".webp")
        await Promise.all([
          writeFile(path.join(framesRoot, "desktop", output), desktop, { flag: "wx" }),
          writeFile(path.join(framesRoot, "mobile", output), mobile, { flag: "wx" }),
        ])
        summary.desktop.bytes += desktop.length
        summary.mobile.bytes += mobile.length
      }))
    }
    for (const [name, index] of Object.entries(summary.posterFrames)) {
      // Accurate input seeking decodes only from the preceding keyframe for a
      // verified CFR master; unusual timestamps retain exact index selection.
      const still = extractPosterFrame(input, index, { timestampSeeking: master.timestampSeeking })
      const desktop = await sharp(still).webp({ quality: 86, effort: 6 }).toBuffer()
      const mobile = await sharp(still).resize({ width: 768 }).webp({ quality: 80, effort: 6 }).toBuffer()
      await Promise.all([
        writeFile(path.join(target, `${name}.webp`), desktop, { flag: "wx" }),
        writeFile(path.join(target, `${name}-mobile.webp`), mobile, { flag: "wx" }),
      ])
    }
    // This linear QA asset is ignored and never enters public/ or the payload.
    command("ffmpeg", ["-hide_banner", "-loglevel", "error", "-n", "-i", input, "-map", "0:v:0", "-an", "-vf", "scale=1280:720:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p", "-movflags", "+faststart", review])
    await writeFile(path.join(target, "delivery.json"), `${JSON.stringify(summary, null, 2)}\n`, { flag: "wx" })
    return summary
  } finally {
    // Only this exact mkdtemp-owned scratch directory is removed. Permanent
    // derivatives and source/review masters are never deleted on failure.
    await rm(temporary, { recursive: true, force: true })
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = parseArguments(process.argv.slice(2))
    if (args.help) console.log("Usage: node scripts/deployment/prepare-inner-system.mjs [--movie=<local path>] [--orbit-frame=<zero-based index>]\nDefault master: artifacts/animated-experience/inner-system-source/inner-system-master.mkv\nDefault orchestration still: midpoint frame. Output: public/animated/inner-system-v1 (must not exist).")
    else console.log(JSON.stringify(await prepareInnerSystem(args)))
  } catch (error) { console.error(`Inner System preparation failed: ${error.message}`); process.exitCode = 1 }
}
