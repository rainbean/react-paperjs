import { useState } from 'react'
import ps from './paper'
import { FIXTURE_JSON } from './fixture'
import PaperCanvas from './PaperCanvas'

export default function App() {
  const [items, setItems] = useState<paper.Path[]>([])

  const load = () => {
    ps.project.importJSON(FIXTURE_JSON)
    setItems(ps.project.getItems({ class: ps.Path }) as paper.Path[])
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>react + paper.js reproduction</h2>
      <PaperCanvas />
      <div style={{ marginTop: 12 }}>
        <button onClick={load}>Load Fixture</button>
        <span style={{ marginLeft: 12 }}>{items.length} path(s) loaded</span>
      </div>
    </div>
  )
}
