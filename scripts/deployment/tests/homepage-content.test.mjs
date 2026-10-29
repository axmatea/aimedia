import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import test from "node:test"
import vm from "node:vm"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ts from "typescript"

const require = createRequire(import.meta.url)
const root = new URL("../../../", import.meta.url)
const read = path => readFileSync(new URL(path, root), "utf8")

function componentModule(path, additionalExports = "") {
  const context = vm.createContext({ exports: {}, require })
  const executable = ts.transpileModule(read(path), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  vm.runInContext(`${executable}\n${additionalExports}`, context)
  return context.exports
}

const { HomeMotionProvider } = componentModule("components/providers/HomeMotionProvider.tsx")
const render = (Component, props) => renderToStaticMarkup(createElement(HomeMotionProvider, null, createElement(Component, props)))
const visibleText = html => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()

test("the pipeline presents five process steps, never invented campaign results", () => {
  const { LeadFunnel } = componentModule("components/ui/lead-funnel.tsx")
  const html = render(LeadFunnel)
  const text = visibleText(html)
  assert.match(text, /Acquisition workflow Research to conversation/)
  for (let index = 1; index <= 5; index++) {
    assert.match(html, new RegExp(`aria-label="Step ${index} of 5">0${index}</strong>`))
  }
  assert.doesNotMatch(text, /8,487|2,088|1,182|402|115|demo|illustrative/i)
  assert.doesNotMatch(read("components/ui/lead-funnel.tsx"), /CountUp/)
  assert.match(text, /Approval before send/)
})

test("content formats replace arbitrary output quotas without changing the channel list", () => {
  const source = read("app/page.tsx")
  for (const label of ["LinkedIn", "X", "Instagram", "YouTube Shorts", "Thought leadership", "Product updates", "Visual storytelling", "Short-form video"]) {
    assert.ok(source.includes(`"${label}"`), label)
  }
  assert.match(source, /Aligned to your channels and strategy/)
  assert.doesNotMatch(source, /AI content team · Demo|Illustrative cadence|\d (?:posts|shorts) \/ week/)
})

test("AI creators keep their interactive controls without simulated live-activity claims", () => {
  const { AIUGCCreators } = componentModule("components/ui/animated-tooltip.tsx")
  const html = render(AIUGCCreators)
  const text = visibleText(html)
  assert.equal((html.match(/aria-pressed="false"/g) ?? []).length, 5)
  assert.match(text, /Zara\.AI · Content focus:/)
  assert.doesNotMatch(text, /now creating|illustrative|demo|online|live/i)
  assert.doesNotMatch(read("components/ui/animated-tooltip.tsx"), /<motion\.|import \{ motion[, }]/)
})

test("platform layers keep real tab controls and avoid invented waiting-item counts", () => {
  const modules = componentModule("components/ui/n8n-workflow-block-shadcnui.tsx", "exports.ChatPanelForTest = ChatDemo; exports.DataPanelForTest = DataDemo;")
  const portal = render(modules.N8nWorkflowBlock)
  assert.equal((portal.match(/role="tab"/g) ?? []).length, 3)
  for (const label of ["Portal", "AI Chat", "Data Layer"]) assert.ok(visibleText(portal).includes(label))
  assert.match(portal, /role="tabpanel"/)
  for (const html of [portal, render(modules.ChatPanelForTest), render(modules.DataPanelForTest)]) {
    assert.doesNotMatch(html, /aria-label="[^"]*(?:demo|illustrative|simulated|example)[^"]*"/i)
  }
  const chat = visibleText(render(modules.ChatPanelForTest))
  assert.match(chat, /Human review/)
  assert.doesNotMatch(chat, /2 waiting|Two approval-gated items are waiting/)
  assert.doesNotMatch(read("app/systems/qualified-pipeline/page.tsx"), /Production, not demo/)
})
