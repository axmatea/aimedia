import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import vm from "node:vm"
import ts from "typescript"

const sourceUrl = new URL("../../../app/animated/animated-experience.tsx", import.meta.url)
const source = readFileSync(sourceUrl, "utf8")
const css = readFileSync(new URL("../../../app/animated/animated-experience.module.css", import.meta.url), "utf8")
const parsed = ts.createSourceFile(sourceUrl.pathname, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const component = parsed.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === "AnimatedExperience")
assert.ok(component?.body, "AnimatedExperience must remain an inspectable client component")

// Extract the real production callbacks and their constants with TypeScript's
// parser. The test does not maintain a second copy of the timeline math, mount a
// browser, load a video, perform network I/O, or modify any global environment.
const pureNames = new Set(["NODES", "ORBIT", "FLOW", "PLATFORM", "clamp", "mix", "smooth", "phase"])
const prelude = parsed.statements.filter(statement => {
  if (ts.isFunctionDeclaration(statement)) return pureNames.has(statement.name?.text)
  return ts.isVariableStatement(statement) && statement.declarationList.declarations.some(declaration => ts.isIdentifier(declaration.name) && pureNames.has(declaration.name.text))
}).map(statement => statement.getText(parsed)).join("\n")

function initializer(name) {
  const declaration = component.body.statements
    .filter(ts.isVariableStatement)
    .flatMap(statement => [...statement.declarationList.declarations])
    .find(item => ts.isIdentifier(item.name) && item.name.text === name)
  assert.ok(declaration?.initializer, `Production ${name} callback must exist`)
  return declaration.initializer
}

const paintInitializer = initializer("paint")
assert.ok(ts.isCallExpression(paintInitializer) && paintInitializer.arguments.length > 0)
const paintSource = paintInitializer.arguments[0].getText(parsed)
const skipSource = initializer("skipToActions").getText(parsed)
const executable = ts.transpileModule(`${prelude}\nconst paint = ${paintSource}; globalThis.callbacks = { paint, skipToActions: ${skipSource} };`, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None },
}).outputText

function fixture(reducedMotion = false) {
  const variables = new Map()
  const focusCalls = []
  const scrollCalls = []
  const element = () => ({
    styles: new Map(), attributes: new Map(),
    style: { setProperty(name, value) { this.owner.styles.set(name, value) } },
    setAttribute(name, value) { this.attributes.set(name, value) },
  })
  const elements = () => Array.from({ length: 4 }, () => {
    const item = element()
    item.style.owner = item
    return item
  })
  const nodeRefs = { current: elements() }
  const pathRefs = { current: elements() }
  const signalRefs = { current: elements() }
  const final = {
    inert: true, attributes: new Map(),
    setAttribute(name, value) { this.attributes.set(name, value) },
    querySelector(selector) {
      assert.equal(selector, "a")
      return { focus: options => focusCalls.push(options) }
    },
  }
  const context = vm.createContext({
    Search: {}, BrainCircuit: {}, Layers3: {}, Workflow: {},
    reducedMotion,
    stageRef: { current: { style: { setProperty: (name, value) => variables.set(name, Number(value)) } } },
    nodeRefs, pathRefs, signalRefs,
    finalRef: { current: final }, finalVisible: { current: false },
    storyRef: { current: { offsetHeight: 6000, getBoundingClientRect: () => ({ top: -100 }) } },
    target: { current: 0 }, current: { current: 0 },
    window: { scrollY: 100, innerHeight: 900, scrollTo: options => scrollCalls.push(options) },
  })
  vm.runInContext(executable, context)
  return { ...context.callbacks, context, variables, nodeRefs, pathRefs, signalRefs, final, focusCalls, scrollCalls }
}

test("the actual cinematic paint callback has no blank phases or competing label phases, forwards or backwards", () => {
  const { paint, variables, nodeRefs, pathRefs, signalRefs } = fixture()
  let minimumCoverage = Infinity
  for (const direction of [1, -1]) {
    for (let step = 0; step <= 1000; step++) {
      const progress = (direction === 1 ? step : 1000 - step) / 1000
      paint(progress)
      const coverage = ["entity-opacity", "bridge-opacity", "graph-opacity", "final-opacity"]
        .reduce((sum, name) => sum + variables.get(`--${name}`), 0)
      minimumCoverage = Math.min(minimumCoverage, coverage)
      assert.ok(coverage >= 0.5, `Blank phase at progress ${progress}`)
      assert.equal(variables.get("--agent-opacity") * variables.get("--action-opacity"), 0, `Agent/action labels compete at ${progress}`)
      assert.equal(variables.get("--action-opacity") * variables.get("--system-opacity"), 0, `Action/business labels compete at ${progress}`)
      const stateCoverage = [0, 1, 2].reduce((sum, index) => sum + variables.get(`--state-${index}`), 0)
      assert.ok(Math.abs(stateCoverage - 1) < 0.00002, `Operational state gap at ${progress}`)
      for (const [index, node] of nodeRefs.current.entries()) {
        const x = parseFloat(node.styles.get("--node-x"))
        const y = parseFloat(node.styles.get("--node-y"))
        assert.ok(x >= 0 && x <= 100 && y >= 0 && y <= 100, `Invalid node ${index} position`)
        assert.doesNotMatch(pathRefs.current[index].attributes.get("d"), /NaN|Infinity/)
        assert.ok(Number.isFinite(Number(signalRefs.current[index].attributes.get("cx"))))
        assert.ok(Number.isFinite(Number(signalRefs.current[index].attributes.get("cy"))))
      }
    }
  }
  assert.ok(minimumCoverage > 0.62)
})

test("reduced-motion composition stays spatially fixed while the same visual states crossfade", () => {
  const { paint, variables, nodeRefs } = fixture(true)
  for (let step = 0; step <= 1000; step++) {
    paint(step / 1000)
    for (const [index, node] of nodeRefs.current.entries()) {
      assert.deepEqual(
        [parseFloat(node.styles.get("--node-x")), parseFloat(node.styles.get("--node-y"))],
        [[25, 25], [75, 25], [25, 75], [75, 75]][index],
      )
    }
    assert.ok(Number.isFinite(variables.get("--graph-opacity")))
  }
})

test("final controls enter the focus order only at resolution and close again on reverse scroll", () => {
  const { paint, final } = fixture()
  for (const [progress, expectedInert] of [[0, true], [0.97, false], [0.5, true], [1, false], [0, true]]) {
    paint(progress)
    assert.equal(final.inert, expectedInert, `Incorrect final focus gate at ${progress}`)
  }
})

test("Skip to actions resolves the real timeline immediately and transfers keyboard focus", () => {
  const { skipToActions, context, final, focusCalls, scrollCalls, variables } = fixture()
  skipToActions()
  assert.equal(scrollCalls.length, 1)
  assert.equal(scrollCalls[0].top, 5100)
  assert.equal(scrollCalls[0].behavior, "instant")
  assert.equal(context.target.current, 1)
  assert.equal(context.current.current, 1)
  assert.equal(variables.get("--final-opacity"), 1)
  assert.equal(final.inert, false)
  assert.equal(final.attributes.get("aria-hidden"), "false")
  assert.equal(focusCalls.length, 1)
  assert.equal(focusCalls[0].preventScroll, true)
})

test("the route retains one sticky timeline with local scroll-scrubbed videos, not stacked autoplay scenes", () => {
  const imports = parsed.statements.filter(ts.isImportDeclaration).map(statement => statement.moduleSpecifier.text)
  assert.ok(!imports.some(name => /system-continuum|inquiry-hero/.test(name)))
  assert.doesNotMatch(source, /https?:\/\/|cloudfront|AnimatedInquiryHero|SystemContinuum/)
  assert.doesNotMatch(css, /scroll-snap|\.continuation\b/)
  assert.match(css, /\.stage\s*\{[^}]*position:\s*sticky/s)
  let storyCount = 0, videoCount = 0
  function visit(node) {
    if (ts.isJsxOpeningElement(node)) {
      const attributes = node.attributes.properties.filter(ts.isJsxAttribute)
      if (node.tagName.getText(parsed) === "section" && attributes.some(attribute => attribute.name.getText(parsed) === "className" && attribute.initializer?.getText(parsed) === "{styles.story}")) storyCount++
      if (node.tagName.getText(parsed) === "video") {
        videoCount++
        assert.ok(!attributes.some(attribute => /^(autoPlay|loop)$/.test(attribute.name.getText(parsed))))
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(parsed)
  assert.equal(storyCount, 1)
  assert.equal(videoCount, 2)
})
