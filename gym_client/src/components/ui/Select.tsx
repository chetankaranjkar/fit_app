import { type ReactNode, type SelectHTMLAttributes, forwardRef, useId } from 'react'
import { formSelectClass, formSelectOptionClass } from '../../lib/formControls'

export type SelectOption = {
  value: string | number
  label: ReactNode
  disabled?: boolean
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  /** When set, renders `<option>` children with dark-theme classes. */
  options?: SelectOption[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, options, children, className = '', id, ...props },
  ref,
) {
  const autoId = useId()
  const selectId = id ?? (label ? `${label.toLowerCase().replace(/\s+/g, '-')}-${autoId}` : autoId)
  const errorId = `${selectId}-error`

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
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={[formSelectClass, className].filter(Boolean).join(' ')}
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
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
})
