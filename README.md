# react-paperjs

Minimal reproduction of a React 19.2 + paper.js 0.12.x incompatibility in **development mode**.

## Reproduce

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`, click **Load Fixture** twice.

- **First click** — canvas draws two shapes, no error.
- **Second click** — browser console throws:

```
Uncaught TypeError: Cannot read properties of undefined (reading 'stroke')
    at Path2.getHandleBounds (paper_dist_paper-core.js ...)
    at addObjectDiffToProperties (react-dom_client.js ...)
    at logComponentRender (react-dom_client.js ...)
    at commitPassiveMountOnFiber (react-dom_client.js ...)
```

Production build (`pnpm build && pnpm preview`) is **not affected**.

## Root cause

React 19.2 dev mode introduced `logComponentRender`, called inside
`commitPassiveMountOnFiber` for every component that has passive effects
(`useEffect`). When a component's props reference changes, `logComponentRender`
calls `addObjectDiffToProperties` to diff old props against new props for the
browser's User Timing API (visible in the Performance panel).

`addObjectDiffToProperties` deep-traverses array elements that exist at the
**same index** in both old and new. When the old and new values are objects of
the same type, it recurses up to 3 levels deep — iterating **all enumerable
properties including prototype getters** via `for...in`.

paper.js defines several bounds getters (`handleBounds`, `strokeBounds`, etc.)
as enumerable accessors on `Path.prototype` via its `Base.beans` mechanism.
When `addObjectDiffToProperties` iterates a `paper.Path`, it reads these
getters on the **old (now-cleared) path object**, which internally access
`options.stroke` (or `this._view._matrix`) on a context that is no longer
valid — producing an uncaught `TypeError`.

### Why two clicks are required

On the first click, `items` goes from `[]` to `[path1, path2]`. Array elements
that are **added** (index not in old array) are logged as `"…"` without
traversal — no crash.

On the second click, `ps.project.clear()` invalidates the existing paths, then
`importJSON` creates fresh replacements. Now `items` goes from
`[old_path1, old_path2]` to `[new_path1, new_path2]` — same length, same
indices, different references. `addObjectDiffToProperties` recurses into each
pair and reads getters on the cleared `old_path` objects — crash.

### Why jsdom tests pass

`logComponentRender` is gated on `supportsUserTiming`
(`typeof performance.measure === 'function'`). jsdom does not implement the
User Timing API, so `logComponentRender` is a no-op there.

## Versions

| package     | version |
|-------------|---------|
| react       | 19.2.7  |
| react-dom   | 19.2.7  |
| paper       | 0.12.18 |

React 19.1.x is not affected. To confirm, change `react` and `react-dom` in
`package.json` to `19.1.0` and reinstall.

---

## Appendix: solution tradeoffs

### Option A — Patch prototype getters to non-enumerable

```ts
// src/paper.ts — run once after new PaperScope()
for (const proto of [ps.Path.prototype, ps.Layer.prototype]) {
  for (const key of Object.keys(proto)) {
    const desc = Object.getOwnPropertyDescriptor(proto, key)
    if (desc?.get) Object.defineProperty(proto, key, { ...desc, enumerable: false })
  }
}
```

**How it works:** Removes paper.js bounds/matrix getters from `for...in` enumeration,
so `addObjectDiffToProperties` never sees them. Direct property access
(`path.handleBounds`) is unaffected — `enumerable` only controls enumeration.

**Pros:** One-time setup, zero runtime cost, no refactoring.

**Cons:** Monkey-patching a third-party prototype. If a future version of paper.js
relies on these getters being enumerable (e.g. for its own serialization walk),
this patch would silently break it. Should be revisited when upgrading paper.js
or when React fixes the underlying issue.

**Revisit trigger:** Upgrade to paper.js > 0.12.x, or React releases a patch that
guards `addObjectDiffToProperties` against throwing getters.

---

### Option B — Store path IDs in state, not path objects ✅ applied

Keep `string[]` (paper.js `item.name`) in React state and Zustand stores.
Resolve to live path objects on demand via `ps.project.getItem({ name })`.

```ts
// Before — paper.js object in state
const [items, setItems] = useState<paper.Path[]>([])

// After — only names in state
const [itemNames, setItemNames] = useState<string[]>([])

// Resolve on demand in render / effects
function ItemRenderer({ itemName }: { itemName: string }) {
  const item = ps.project?.getItem({ name: itemName }) as paper.Path
  if (!item) return null
  // ...
}
```

**Key constraint:** the name must be assigned to the leaf `Path`, not to a
parent `Group`. `ps.project.getItem({ name })` matches on `item.name`; a
`Group` node is not a `Path` and the lookup returns `undefined` if the name
lives on the group instead of the path itself.

**Pros:** React never traverses paper.js objects — structurally correct regardless
of React version. Survives any future change to `addObjectDiffToProperties`.

**Cons:** Requires refactoring all state hooks and component props that pass
`paper.Path` objects. Path names must be stable and unique across loads
(`importJSON` preserves names from the serialised graph).

---

### Option C — Wait for React or paper.js to fix upstream

`addObjectDiffToProperties` should either skip inherited prototype getters or
`try/catch` getter invocations. This is a React bug — invoking arbitrary
third-party getters without error handling is fragile by design.

**Pros:** No code change required.

**Cons:** Unknown timeline. Requires staying on React 19.1.x until resolved.
