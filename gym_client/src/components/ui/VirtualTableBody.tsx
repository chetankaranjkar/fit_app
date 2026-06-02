import { memo, useRef, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

type VirtualTableBodyProps<T> = {
  items: T[]
  estimateRowHeight?: number
  maxHeight?: number
  renderRow: (item: T, index: number) => ReactNode
}

function VirtualTableBodyInner<T>({
  items,
  estimateRowHeight = 52,
  maxHeight = 640,
  renderRow,
}: VirtualTableBodyProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 8,
  })

  return (
    <div ref={parentRef} className="overflow-auto" style={{ maxHeight }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index]
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderRow(item, virtualRow.index)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const VirtualTableBody = memo(VirtualTableBodyInner) as typeof VirtualTableBodyInner
