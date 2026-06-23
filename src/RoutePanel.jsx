import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${month}/${day}/${year}`
}

function SortableItem({ stop, index, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stop.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} className="route-stop">
      <button className="route-stop-handle" {...attributes} {...listeners} aria-label="Drag to reorder">⠿</button>
      <span className="route-stop-num">{index + 1}</span>
      <div className="route-stop-info">
        <strong>{stop.title}</strong>
        <span>{stop.address} · {formatDate(stop.date_start)}–{formatDate(stop.date_end)}</span>
      </div>
      <button className="route-stop-remove" onClick={() => onRemove(stop.id)} aria-label="Remove stop">✕</button>
    </div>
  )
}

export default function RoutePanel({ stops, onReorder, onRemoveStop, fetching, error, legs }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const totalMeters = legs.reduce((sum, leg) => sum + leg.distance, 0)
  const totalSecs = legs.reduce((sum, leg) => sum + leg.duration, 0)
  const totalMi = legs.length ? (totalMeters / 1609.34).toFixed(1) : null
  const totalTime = legs.length
    ? totalSecs < 3600
      ? `${Math.round(totalSecs / 60)} min`
      : `${Math.floor(totalSecs / 3600)} hr ${Math.round((totalSecs % 3600) / 60)} min`
    : null

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIndex = stops.findIndex(s => s.id === active.id)
    const newIndex = stops.findIndex(s => s.id === over.id)
    onReorder(arrayMove(stops.map(s => s.id), oldIndex, newIndex))
  }

  return (
    <div className="route-panel-wrap">
      {(fetching || error || totalMi !== null) && (
        <div className={`route-summary${(!fetching && !error && totalMi !== null) ? ' route-summary-ready' : ''}`}>
          {fetching && <span className="route-summary-loading">Fetching route…</span>}
          {!fetching && error && <span className="route-summary-error">{error}</span>}
          {!fetching && !error && totalMi !== null && `↔  ${totalMi} mi · ${totalTime}`}
        </div>
      )}
      <div className="route-panel-list">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={stops.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {stops.map((stop, i) => (
              <SortableItem key={stop.id} stop={stop} index={i} onRemove={onRemoveStop} />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}
