import ps from './paper'

type Props = {
  itemIds: string[]
}

export default function PathList({ itemIds }: Props) {
  return (
    <ul>
      {itemIds.map((id) => {
        const path = ps.project.getItem({ name: id }) as paper.Path | null
        return (
          <li key={id}>
            {id} — segments: {path?.segments.length ?? '?'}
          </li>
        )
      })}
    </ul>
  )
}
