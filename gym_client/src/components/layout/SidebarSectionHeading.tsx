/** Section label in the expanded sidebar; a thin divider when collapsed. */
export function SidebarSectionHeading({
  label,
  collapsed,
  first,
}: {
  label: string
  collapsed: boolean
  first: boolean
}) {
  if (collapsed) {
    return first ? null : <div aria-hidden className="mx-2 my-2 border-t border-white/10" />
  }
  return (
    <p
      className={`px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 ${
        first ? 'pt-1' : 'pt-4'
      }`}
    >
      {label}
    </p>
  )
}
