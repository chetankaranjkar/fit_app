import { useContext } from 'react'
import { ArrowUpRight, BookOpen, Check, Lightbulb } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SlideOverPanel } from '../../../components/ui/SlideOverPanel'
import { HelpUiContext } from '../HelpUiContext'
import { useHelpModuleArticle } from '../hooks/useHelp'
import { guideForModule, helpCategories, helpGuides } from '../data/helpGuides'

export function HelpDrawer() {
  const ctx = useContext(HelpUiContext)
  const { data, isLoading, isError } = useHelpModuleArticle(ctx?.drawerModuleKey ?? '', ctx?.drawerOpen ?? false)
  if (!ctx) return null
  const guide = guideForModule(ctx.drawerModuleKey)
  const related = helpGuides.filter((g) => g.categoryId === guide?.categoryId && g.id !== guide?.id).slice(0, 3)
  return (
    <SlideOverPanel open={ctx.drawerOpen} onClose={ctx.closeDrawer} className="help-ui help-drawer" widthClass="max-w-[500px]"
      title={<span className="flex items-center gap-2"><BookOpen className="size-5" /> Page guide</span>}
      subtitle={helpCategories.find((c) => c.id === guide?.categoryId)?.name ?? 'Help & guidance'}
      footer={<Link className="help-primary w-full justify-center" to={guide ? `/help?article=${guide.id}` : '/help'} onClick={ctx.closeDrawer}>Read the full guide <ArrowUpRight className="size-4" /></Link>}>
      {isLoading && <p role="status" className="help-muted">Loading your page guide…</p>}
      {isError && <p role="alert">This guide could not be loaded. Open the Help Center to browse other topics.</p>}
      {data && <>
        <span className="help-eyebrow">A little guidance, right where you need it</span>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">{data.title}</h2>
        <p className="help-muted mt-3 text-sm leading-6">{data.description}</p>
        <h3 className="mb-4 mt-8 text-sm font-semibold">Step by step</h3>
        <ol className="help-steps">{data.bullets.map((step, i) => <li key={step}><span>{i + 1}</span><p>{step}</p></li>)}</ol>
        {guide && <div className="help-tip mt-7"><Lightbulb className="size-5 shrink-0" /><div><h3 className="font-semibold">Good to know</h3><p className="mt-1 text-sm leading-6">{guide.tip}</p></div></div>}
        {related.length > 0 && <section className="mt-8"><h3 className="mb-3 text-sm font-semibold">Continue learning</h3>{related.map((g) => <Link className="help-related" key={g.id} to={`/help?article=${g.id}`} onClick={ctx.closeDrawer}><span>{g.title}</span><ArrowUpRight className="size-4 shrink-0" /></Link>)}</section>}
        <p className="help-muted mt-7 flex items-start gap-2 text-xs leading-5"><Check className="mt-0.5 size-4 shrink-0" /> Actions depend on your role. Ask your gym administrator if a control is missing.</p>
      </>}
    </SlideOverPanel>
  )
}
