import { type ReactNode, type SelectHTMLAttributes, forwardRef } from 'react'
import { formSelectClass, formSelectOptionClass } from '../../lib/formControls'

export type SelectOption = {
  value: string | number
  label: ReactNode
  disabled?: boolean
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  /** When set, renders `<option>` children with dark-theme classes. */
  options?: SelectOption[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, children, className = '', id, ...props },
  ref,
) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={selectId}
          className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400"
        >
          {label}
        </label>
      ) : null}
      <select
        ref={ref}
        id={selectId}
        className={[formSelectClass, className].filter(Boolean).join(' ')}
        {...props}
      >
        {options
          ? options.map((o) => (
              <option
                key={o.value}
                value={o.value}
                disabled={o.disabled}
                className={formSelectOptionClass}
              >
                {o.label}
              </option>
            ))
          : children}
      </select>
    </div>
  )
})
