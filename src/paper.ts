import { PaperScope } from 'paper/dist/paper-core'

const ps = new PaperScope()

// React 19.2 dev mode's addObjectDiffToProperties iterates enumerable prototype
// getters via for...in when diffing props. paper.js defines bounds/matrix getters
// as enumerable beans, which crash when invoked on cleared path objects.
// Making them non-enumerable keeps them off the for...in walk.
for (const proto of [ps.Path.prototype, ps.Layer.prototype]) {
  for (const key of Object.keys(proto)) {
    const desc = Object.getOwnPropertyDescriptor(proto, key)
    if (desc?.get) Object.defineProperty(proto, key, { ...desc, enumerable: false })
  }
}

export default ps
