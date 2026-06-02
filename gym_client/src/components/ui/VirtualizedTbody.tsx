import { useRef, type CSSProperties, type ReactElement } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

type VirtualizedTbodyProps<T> = {
  items: T[]
  estimateRowHeight?: number
  maxHeight?: number
  getItemKey: (item: T, index: number) => string | number
  renderRow: (item: T, index: number, style: CSSProperties) => ReactElement
}

/**
 * Virtualized table body for large lists. Parent table should use `table-fixed w-full`;
 * header stays outside this scroll region (sticky thead in parent).
 */
export function VirtualizedTbody<T>({
  items,
  estimateRowHeight = 56,
  maxHeight = 560,
  getItemKey,
  renderRow,
}: VirtualizedTbodyProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 12,
    getItemKey: (index) => String(getItemKey(items[index], index)),
  })

  return (
    <div ref={scrollRef} className="overflow-auto" style={{ maxHeight }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index]
          const rowStyle: CSSProperties = {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: `${virtualRow.size}px`,
            transform: `translateY(${virtualRow.start}px)`,
            display: 'table',
            tableLayout: 'fixed',
          }
          return (
            <div key={virtualRow.key} style={rowStyle}>
              <table className="w-full table-fixed">
                <tbody>{renderRow(item, virtualRow.index, {})}</tbody>
              </table>
            </div>
          )
        })}
      </div>
    </div>
  )
}
