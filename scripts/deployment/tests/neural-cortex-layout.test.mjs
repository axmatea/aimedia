import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import vm from "node:vm"
import ts from "typescript"

const read = file => readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8")
function load(file) {
  const context = vm.createContext({ exports: {} })
  vm.runInContext(ts.transpileModule(read(file), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText, context)
  return context.exports
}
const { CINEMA, POSTERS } = load("components/animated-cinema/config.ts")
const { filmRect, framingAt } = load("components/animated-cinema/timeline.ts")

test("the brain's orchestrator is the literal central anchor, not a lower satellite caption", () => {
  const core = CINEMA.agents.find(agent => agent.name === "Orchestrator")
  assert.equal(core.x, .5)
  assert.equal(core.y, .5)
  const ui = read("components/animated-cinema/cinematic-experience.tsx")
  assert.match(ui, /data-role=\{agent\.name === "Orchestrator" \? "orchestrator" : "agent"\}/)
  const css = read("components/animated-cinema/cinematic-experience.module.css")
  assert.match(css, /\.agent \{[^}]*transform: translate\(-50%, -50%\)/)
  assert.doesNotMatch(css, /translate\(-50%, (14|22)px\)/)
})

test("readable brain states keep center and all six labels separated on every target viewport", () => {
  for (const [width, height] of [[1440, 900], [1280, 800], [768, 1024], [390, 844], [360, 800]]) {
    for (const progress of [.79, .82, .87, .91]) {
      const framing = framingAt(progress, width / height < .95 ? CINEMA.framing.portrait : CINEMA.framing.desktop)
      assert.equal(framing.immersion, 0, "Do not crop side labels during neural coordination")
      const film = filmRect(width, height, 16 / 9, framing)
      const labels = CINEMA.agents.map(agent => {
        // Conservative bounds; actual browser font rectangles are checked too.
        const core = agent.name === "Orchestrator"
        const w = core ? 100 : 72, h = core ? 30 : 20
        const x = film.x + agent.x * film.width, y = film.y + agent.y * film.height
        if (core) { assert.ok(Math.abs(x - width / 2) < .001); assert.ok(Math.abs(y - height / 2) < .001) }
        return { left: x - w / 2, right: x + w / 2, top: y - h / 2, bottom: y + h / 2 }
      })
      for (let i = 0; i < labels.length; i++) {
        const a = labels[i]
        assert.ok(a.left >= 10 && a.right <= width - 10 && a.top >= 100 && a.bottom <= height - 80)
        for (const b of labels.slice(i + 1)) assert.ok(a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top, "Agent labels may not overlap")
      }
    }
  }
})

test("the new story and reduced-motion posters cannot accidentally append the retired orbital tail", () => {
  assert.equal(CINEMA.root, "/animated/neural-cortex-v1")
  assert.deepEqual(Array.from(POSTERS, poster => poster.name), ["entity", "brain", "signals"])
  const assembly = read("scripts/deployment/assemble-neural-cortex.mjs")
  assert.match(assembly, /trim=start_frame=0:end_frame=360/)
  assert.doesNotMatch(assembly, /start_frame=240|\[ending\]|\[c\]|split=2/)
  assert.match(assembly, /"-an"/)
})
