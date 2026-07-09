/**
 * html-validate ruleset for the local audit pipeline (scripts/audit.mjs).
 *
 * The audit validates SSR snapshots of React 19 / Next 16 output, not
 * hand-written HTML. The stock "recommended" preset flagged 294 errors on the
 * home page, almost all of them stylistic disagreements with how the React DOM
 * serializer emits markup. Rules below are tuned so the report is signal
 * (real spec violations, a11y problems, invalid attribute values) instead of
 * framework noise. Everything not listed here stays at the recommended
 * defaults.
 *
 * Relaxed rules and why:
 *
 * - void-style -> "selfclosing": React always serializes void elements as
 *   self-closing (`<img/>`). Both forms parse identically in HTML5; we align
 *   the rule with the serializer instead of disabling it, so a stray
 *   hand-written `<br>` in raw HTML still gets caught for consistency.
 *
 * - attribute-boolean-style -> "empty": React serializes boolean attributes
 *   as `async=""` / `defer=""`. Valid per spec; align with the serializer.
 *
 * - attribute-empty-style -> "empty": same serializer behavior for
 *   attributes that allow an empty value (`crossorigin=""`, `hidden=""`).
 *
 * - no-inline-style -> off: inline `style` props are how React applies
 *   dynamic values (CSS variables, transforms, animation state). This is a
 *   stylesheet-hygiene rule for hand-written HTML, not a correctness issue
 *   in a React app. 133 hits, all framework idiom.
 *
 * - attr-case -> off: React/Next emit a few camelCase attribute names
 *   (`fetchPriority`, `charSet`, `noModule`) in SSR output. HTML attribute
 *   names are ASCII case-insensitive per spec, so this is harmless and not
 *   under our control.
 *
 * - valid-id -> relaxed: React `useId` generates ids like `_R_b2lulb_`.
 *   Any non-whitespace id is valid in HTML5; the rule default enforces the
 *   legacy HTML4 "must start with a letter" constraint. `relaxed` keeps the
 *   rule alive (still bans whitespace/empty ids).
 *
 * Deliberately KEPT on (real signal, fix in source when they fire):
 * no-implicit-button-type, attribute-allowed-values, aria-label-misuse,
 * no-dup-class, element-permitted-content, and the rest of "recommended".
 */
const config = {
  root: true,
  extends: ["html-validate:recommended"],
  rules: {
    "void-style": ["error", { style: "selfclosing" }],
    "attribute-boolean-style": ["error", { style: "empty" }],
    "attribute-empty-style": ["error", { style: "empty" }],
    "no-inline-style": "off",
    "attr-case": "off",
    "valid-id": ["error", { relaxed: true }],
  },
};

export default config;
