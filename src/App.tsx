import { useEffect, useState } from 'react'
import ps from './paper'
import { FIXTURE_JSON } from './fixture'
import PaperCanvas from './PaperCanvas'
import PathList from './PathList'

export default function App() {
  const [items, setItems] = useState<paper.Path[]>([])

  useEffect(() => {}, [items])

  const load = () => {
    ps.project.clear()
    ps.project.importJSON(FIXTURE_JSON)
    setItems(ps.project.getItems({ class: ps.Path }) as paper.Path[])
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>react + paper.js reproduction</h2>
      <PaperCanvas />
      <div style={{ marginTop: 12 }}>
        <button onClick={load}>Load Fixture</button>
        <p style={{ marginTop: 8, color: '#666', fontSize: 14 }}>
          Click <strong>Load Fixture</strong> twice. First click draws correctly.
          Second click throws{' '}
          <code>TypeError: Cannot read properties of undefined (reading 'stroke')</code>
          {' '}in the browser console (dev mode only — production build is unaffected).
        </p>
      </div>
      <PathList items={items} />
    </div>
  )
}
