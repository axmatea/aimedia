import { spawnSync } from "node:child_process"
import path from "node:path"
import { stat } from "node:fs/promises"

// Exact approved opening and ending surround the reviewed generated interior.
// The joins overlap the same chest/core and same orbital mechanism, not slides.
const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const match = /^--(approved|continuation)=(.+)$/.exec(arg)
  if (!match) throw new Error("Use --approved=<master.mp4> --continuation=<master.mp4>")
  return [match[1], path.resolve(match[2])]
}))
if (!args.approved || !args.continuation) throw new Error("Both verified silent masters are required.")
for (const file of Object.values(args)) if (!(await stat(file)).isFile()) throw new Error("Missing source master.")
const destination = "artifacts/animated-experience/inner-system-source/inner-system-master.mkv"
const result = spawnSync("ffmpeg", [
  "-hide_banner", "-loglevel", "error", "-n",
  "-i", args.approved, "-i", args.continuation,
  "-filter_complex",
  "[0:v]split=2[opening][ending];" +
  "[opening]trim=start_frame=0:end_frame=144,setpts=PTS-STARTPTS,format=yuv444p10le[a];" +
  "[1:v]trim=start_frame=6,setpts=PTS-STARTPTS,format=yuv444p10le[b];" +
  "[ending]trim=start_frame=240:end_frame=481,setpts=PTS-STARTPTS,format=yuv444p10le[c];" +
  "[a][b]xfade=transition=fade:duration=0.25:offset=5.75[interior];" +
  "[interior][c]xfade=transition=fade:duration=0.75:offset=24.7916666667[out]",
  "-map", "[out]", "-an", "-c:v", "ffv1", "-level", "3", "-r", "24", destination,
], { stdio: "inherit" })
if (result.error || result.status !== 0) throw new Error("Composition failed. Existing masters were not changed.")
