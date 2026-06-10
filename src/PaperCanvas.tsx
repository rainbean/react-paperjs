import { useEffect, useRef } from 'react'
import ps from './paper'

export default function PaperCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    ps.setup(canvasRef.current!)
    return () => { ps.project.remove() }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={400}
      style={{ border: '1px solid #ccc' }}
    />
  )
}
