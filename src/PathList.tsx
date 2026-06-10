import { useEffect } from 'react'

type Props = {
  items: paper.Path[]
}

export default function PathList({ items }: Props) {
  useEffect(() => {}, [items])

  return (
    <ul>
      {items.map((item, i) => (
        <li key={i}>path {i + 1}</li>
      ))}
    </ul>
  )
}
