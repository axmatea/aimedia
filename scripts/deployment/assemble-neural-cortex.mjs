import { spawnSync } from "node:child_process"
import path from "node:path"
import { stat } from "node:fs/promises"

// Scoped cinematic revision. Keep the approved entity/core/microchannels;
// never append either the old satellite orbit or the old linear workflow.
const args = {}
for (const arg of process.argv.slice(2)) {
  const match = /^--(approved|continuation)=(.+)$/.exec(arg)
  if (!match || args[match[1]]) throw new Error("Use one --approved=<master> and --continuation=<master>")
  args[match[1]] = path.resolve(match[2])
}
if (!args.approved || !args.continuation) throw new Error("Both reviewed silent masters are required.")
for (const file of Object.values(args)) if (!(await stat(file)).isFile()) throw new Error("Missing source master.")
const result = spawnSync("ffmpeg", [
  "-hide_banner", "-loglevel", "error", "-n",
  "-i", args.approved, "-i", args.continuation,
  "-filter_complex",
  "[0:v]trim=start_frame=0:end_frame=360,fps=24,settb=AVTB,setpts=PTS-STARTPTS,format=yuv444p10le[a];" +
  "[1:v]fps=24,settb=AVTB,setpts=PTS-STARTPTS,format=yuv444p10le[b];" +
  "[a][b]xfade=transition=fade:duration=0.25:offset=14.75[out]",
  "-map", "[out]", "-an", "-c:v", "ffv1", "-level", "3", "-r", "24",
  "artifacts/animated-experience/neural-cortex-source/neural-cortex-master.mkv",
], { stdio: "inherit" })
if (result.error || result.status !== 0) throw new Error("Composition failed. Existing sources were not changed.")
