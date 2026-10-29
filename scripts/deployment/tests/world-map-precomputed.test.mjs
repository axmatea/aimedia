import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import test from "node:test"
import vm from "node:vm"
import ts from "typescript"
import { buildWorldMaps } from "../precompute-world-map.mjs"

const source = readFileSync(new URL("../../../components/ui/map.tsx", import.meta.url), "utf8")
const generated = buildWorldMaps()
const assets = Object.fromEntries(["dark", "light"].map(theme => [
  theme,
  readFileSync(new URL(`../../../public/maps/world-v1-${theme}.svg`, import.meta.url), "utf8"),
]))
const hash = value => createHash("sha256").update(value).digest("hex")

test("static world-map assets preserve the exact original geometry, dimensions and theme colors", () => {
  for (const theme of ["dark", "light"]) {
    assert.equal(assets[theme].trimEnd(), generated[theme].trimEnd())
    assert.match(assets[theme], /viewBox="0 0 198 100"/)
    assert.equal((assets[theme].match(/<circle /g) ?? []).length, 8476)
    assert.match(assets[theme], theme === "dark" ? /fill="#FFFFFF20"/ : /fill="#00000040"/)
  }
  const geometry = theme => assets[theme].replace(/#[A-F0-9]{8}/g, "THEME")
  assert.equal(hash(geometry("dark")), hash(geometry("light")))
})

test("the client no longer imports or computes a dotted-map grid or data URL", () => {
  const parsed = ts.createSourceFile("map.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const imports = parsed.statements.filter(ts.isImportDeclaration).map(node => node.moduleSpecifier.text)
  assert.ok(!imports.includes("dotted-map"))
  assert.doesNotMatch(source, /new DottedMap|buildMapSVG|encodeURIComponent|data:image\/svg/)
  assert.doesNotMatch(source, /requestIdleCallback/)
})

function renderMap(theme, { active = false, reduceMotion = false } = {}) {
  const jsx = (tag, props) => ({ tag, props })
  const context = vm.createContext({
    exports: {},
    require(name) {
      if (name === "react") return {
        useRef: () => ({ current: null }),
        useState: value => [value === false ? active : value, () => {}],
        useMemo: callback => callback(),
        useEffect() {},
      }
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx }
      if (name === "motion/react") return {
        m: { path: "motion.path", circle: "motion.circle", div: "motion.div" },
        AnimatePresence: "AnimatePresence",
        useReducedMotion: () => reduceMotion,
      }
      if (name === "next-themes") return { useTheme: () => ({ resolvedTheme: theme }) }
      throw new Error(`Unexpected client dependency: ${name}`)
    },
  })
  const executable = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  vm.runInContext(executable, context)
  return context.exports.WorldMap({ dots: [{
    start: { lat: 40, lng: -74, label: "New York" },
    end: { lat: 51, lng: 0, label: "London" },
  }] })
}

function descendants(tree, tag) {
  if (!tree || typeof tree !== "object") return []
  if (Array.isArray(tree)) return tree.flatMap(child => descendants(child, tag))
  return [
    ...(tree.tag === tag ? [tree] : []),
    ...descendants(tree.props?.children, tag),
  ]
}

test("only the resolved theme asset loads lazily with a stable footprint", () => {
  assert.equal(descendants(renderMap(undefined), "img").length, 0)
  for (const theme of ["dark", "light"]) {
    const [image] = descendants(renderMap(theme), "img")
    assert.equal(image.props.src, `/maps/world-v1-${theme}.svg`)
    assert.equal(image.props.width, 198)
    assert.equal(image.props.height, 100)
    assert.equal(image.props.loading, "lazy")
    assert.equal(image.props.decoding, "async")
    assert.match(image.props.className, /object-cover opacity-80/)
  }
})

test("the original HTML labels, routes, viewport gating and reduced-motion behavior remain", () => {
  assert.equal(descendants(renderMap("dark"), "motion.path").length, 0)
  const active = renderMap("dark", { active: true })
  const [path] = descendants(active, "motion.path")
  assert.equal(path.props.d, "M 235.55555555555557 111.11111111111111 Q 317.77777777777777 26.66666666666667 400 86.66666666666667")
  assert.equal(path.props.transition.repeat, Infinity)
  assert.equal(descendants(active, "foreignObject").length, 2)
  assert.equal(descendants(active, "motion.circle").length, 1)
  const reduced = renderMap("light", { active: true, reduceMotion: true })
  assert.equal(descendants(reduced, "motion.circle").length, 0)
  assert.equal(descendants(reduced, "motion.path")[0].props.transition.duration, 0)
  assert.equal(descendants(reduced, "foreignObject").length, 2)
})
