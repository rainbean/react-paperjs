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
