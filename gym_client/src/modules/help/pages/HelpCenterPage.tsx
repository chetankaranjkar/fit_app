import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronRight, Clock3, Compass, CreditCard, Dumbbell, LifeBuoy, Search, Settings2, ShieldCheck, Users, Wrench, X } from 'lucide-react'
import { authService } from '../../../services/auth.service'
import { useDashboardTheme } from '../../../lib/dashboardTheme'
import { HelpButton } from '../components/HelpButton'
import { HelpArticleBody } from '../components/HelpArticleBody'
import { useHelpArticleDetail, useHelpArticles, useHelpCategories } from '../hooks/useHelp'
import { helpGuides, readingMinutes } from '../data/helpGuides'

const icons = { 'getting-started': Compass, 'members-access': Users, billing: CreditCard, training: Dumbbell, operations: Wrench, settings: Settings2 }
const faqs = [
  ['Why can’t I see a page or action?', 'The screens and actions you see depend on your role and permissions. Ask your gym administrator to check your account access.'],
  ['Does collecting a payment renew gym access?', 'A payment settles a balance. Membership start and end dates determine access, so use the renewal workflow when access needs extending.'],
  ['Why is a workout or diet plan missing?', 'A plan in the library must be assigned to a member before it appears as their prescribed plan. Ask the coach to check the member’s assignment.'],
  ['What should I do if QR check-in fails?', 'Check camera permissions and scan the QR for the correct branch. Read the rejection reason and ask the front desk to review membership dates and payment standing.'],
]

export function HelpCenterPage() {
  const navigate = useNavigate()
  useDashboardTheme()
  const [params, setParams] = useSearchParams()
  const category = params.get('category') ?? ''
  const articleId = params.get('article') ?? ''
  const query = params.get('q') ?? ''
  const [input, setInput] = useState(query)
  const [showAll, setShowAll] = useState(false)
  const articleRef = useRef<HTMLElement>(null)
  const { data: categories = [], isLoading: categoriesLoading } = useHelpCategories()
  const { data: articles = [], isLoading, isError, refetch } = useHelpArticles(category || undefined, query || undefined)
  const { data: article, isLoading: articleLoading } = useHelpArticleDetail(articleId || null)
  const selectedGuide = helpGuides.find((g) => g.id === articleId)
  const categoryName = categories.find((c) => c.id === category)?.name

  useEffect(() => {
    if (!authService.getAccessToken()) navigate('/login', { replace: true, state: { from: '/help' } })
  }, [navigate])
  useEffect(() => { setInput(query) }, [query])
  useEffect(() => { if (articleId) articleRef.current?.focus() }, [articleId])

  function update(values: Record<string, string>) {
    const next = new URLSearchParams(params)
    Object.entries(values).forEach(([key, value]) => { if (value) next.set(key, value); else next.delete(key) })
    setParams(next)
  }
  function search(value: string) {
    // A new search spans the whole library, even after browsing a topic.
    update({ q: value.trim(), category: '', article: '' })
  }

  return <div className="help-ui help-center">
    <a className="help-skip" href="#help-main">Skip to help content</a>
    <header className="help-header"><div className="help-container flex flex-wrap items-center justify-between gap-3">
      <Link to="/help" className="flex items-center gap-3" aria-label="Help Center home"><span className="help-brand"><LifeBuoy className="size-6" /></span><span className="text-base font-semibold tracking-tight">Tiger Fitness <span className="help-muted mx-2 font-normal">/</span> Help Center</span></Link>
      <div className="flex items-center gap-3"><Link className="help-back" to="/dashboard"><ArrowLeft className="size-4" /> Back to dashboard</Link><HelpButton moduleKey="help_center" size="sm" /></div>
    </div></header>
    <main id="help-main" className="help-container pb-24" tabIndex={-1}>
      <section className="help-hero">
        <span className="help-eyebrow"><span className="help-dot" /> YOUR GYM, MADE SIMPLER</span>
        <h1>How can we help you?</h1>
        <p>Clear answers. Practical guides. A smoother day at your gym.</p>
        <form className="help-search" role="search" onSubmit={(e) => { e.preventDefault(); search(input) }}>
          <Search className="size-5 shrink-0" aria-hidden="true" /><input aria-label="Search all help guides" placeholder="Search memberships, payments, workouts…" value={input} onChange={(e) => setInput(e.target.value)} data-help-ignore-shortcut />
          {input && <button className="help-clear" type="button" aria-label="Clear search" onClick={() => { setInput(''); search('') }}><X className="size-4" /></button>}
          <button className="help-primary" type="submit">Search <ArrowRight className="size-4" /></button>
        </form>
        <div className="help-popular"><span>Popular searches</span>{['Renewal', 'Receipt', 'QR', 'Workout'].map((term) => <button key={term} onClick={() => search(term)}>{term}<ArrowUpRight className="size-3" /></button>)}</div>
      </section>

      {!articleId && !category && !query && <section className="help-start">
        <span className="help-start-icon"><BookOpen className="size-6" /></span><div className="min-w-0 flex-1"><span className="help-eyebrow">NEW HERE?</span><h2>Start with the essentials</h2><p>Get oriented, add your first member, and understand the daily workflow.</p></div>
        <button className="help-secondary" onClick={() => update({ article: 'guide-members' })}>Explore the guide <ArrowRight className="size-4" /></button>
      </section>}

      <div className="help-workspace">
        <aside className="help-sidebar"><p className="help-eyebrow mb-4">BROWSE BY TOPIC</p><nav aria-label="Help topics">
          <button aria-current={!category ? 'page' : undefined} className={!category ? 'active' : ''} onClick={() => { setShowAll(true); update({ category: '', article: '' }) }}><BookOpen className="size-4" /><span>All guides</span><span className="help-count">{helpGuides.length}</span></button>
          {categoriesLoading && <p role="status">Loading topics…</p>}
          {categories.map((c) => { const Icon = icons[c.id as keyof typeof icons] ?? BookOpen; return <button key={c.id} aria-current={category === c.id ? 'page' : undefined} className={category === c.id ? 'active' : ''} onClick={() => update({ category: c.id, article: '' })}><Icon className="size-4 shrink-0" /><span>{c.name}</span><ChevronRight className="ml-auto size-3 shrink-0" /></button> })}
        </nav><div className="help-sidebar-note"><ShieldCheck className="mb-3 size-5" /><h3>Help on every page</h3><p>Open the Help button or press <kbd>?</kbd> for a guide to the screen you’re using.</p></div></aside>

        <section className="min-w-0" ref={articleRef} tabIndex={-1} aria-label={articleId ? 'Guide reader' : 'Help library'}>
          {articleId ? <>
            <button className="help-back mb-5" onClick={() => update({ article: '' })}><ArrowLeft className="size-4" /> Back to guides</button>
            {articleLoading && <p role="status" className="help-panel p-8">Loading guide…</p>}
            {!articleLoading && !article && <div className="help-panel p-8"><h2 className="text-xl font-semibold">This guide couldn’t be found</h2><p className="help-muted mt-2">Choose a topic or search the library to find another guide.</p></div>}
            {article && <article className="help-panel help-reader"><div className="help-eyebrow flex flex-wrap items-center gap-2"><BookOpen className="size-4" />{categories.find((c) => c.id === article.categoryId)?.name ?? 'Guide'}<span>·</span><Clock3 className="size-3" />{readingMinutes(article.bodyMarkdown)} min read</div><h2>{article.title}</h2><p className="help-reader-summary">{article.summary}</p><HelpArticleBody markdown={article.bodyMarkdown} /><div className="help-reader-end"><Check className="size-4" /><span>You’re ready for the next step. Return to your page to continue.</span></div></article>}
            {selectedGuide && <div className="mt-6"><h3 className="mb-3 text-sm font-semibold">Related guides</h3>{helpGuides.filter((g) => g.categoryId === selectedGuide.categoryId && g.id !== selectedGuide.id).slice(0, 3).map((g) => <button key={g.id} className="help-related w-full" onClick={() => update({ article: g.id })}>{g.title}<ArrowRight className="size-4" /></button>)}</div>}
          </> : <>
            <div className="help-section-title"><div><span className="help-eyebrow">THE KNOWLEDGE LIBRARY</span><h2>{query ? `Results for “${query}”` : categoryName ?? 'A guide for every part of your gym'}</h2><p>{query ? 'Search titles, descriptions and step-by-step guidance.' : categories.find((c) => c.id === category)?.description ?? 'Choose a topic, or jump into the task you’re working on.'}</p></div>{(category || query) && <button className="help-back" onClick={() => update({ category: '', q: '', article: '' })}>Reset filters <X className="size-3" /></button>}</div>
            {!category && !query && <div className="help-topic-grid">{categories.map((c) => { const Icon = icons[c.id as keyof typeof icons] ?? BookOpen; return <button className="help-topic-card" key={c.id} onClick={() => update({ category: c.id, article: '' })}><span className={`help-topic-icon tone-${c.sortOrder % 6}`}><Icon className="size-5" /></span><h3>{c.name}</h3><p>{c.description}</p><span className="help-topic-link">Explore topic <ArrowRight className="size-4" /></span></button> })}</div>}
            <div className="help-list-heading"><h3>{category || query ? 'Guides' : 'Explore the guides'}</h3><span className="help-muted text-xs" role="status">{isLoading ? 'Loading…' : `${articles.length} guides`}</span></div>
            {isError && <div role="alert" className="help-panel p-5">Guides couldn’t be loaded. <button className="underline" onClick={() => void refetch()}>Try again</button></div>}
            {isLoading && <div className="help-panel p-8" role="status">Finding your guides…</div>}
            {!isLoading && articles.length === 0 && <div className="help-empty help-panel"><Search className="mx-auto mb-4 size-7" /><h3>No guides found</h3><p>Try a shorter phrase such as “payment”, “member” or “plan”.</p><button className="help-secondary mt-5" onClick={() => { setInput(''); update({ q: '', category: '' }) }}>Browse all guides</button></div>}
            <div className="help-article-list">{(category || query || showAll ? articles : articles.slice(0, 8)).map((a) => <button key={a.id} onClick={() => update({ article: a.id })}><span className="help-list-icon"><BookOpen className="size-4" /></span><span className="min-w-0 flex-1"><span className="help-article-title">{a.title}</span><span className="help-article-summary">{a.summary}</span></span><ArrowUpRight className="size-4 shrink-0" /></button>)}</div>
            {!category && !query && !showAll && articles.length > 8 && <button className="help-secondary mt-5" onClick={() => setShowAll(true)}>View all {articles.length} guides <ArrowRight className="size-4" /></button>}
          </>}
        </section>
      </div>
      {!articleId && <section className="help-faq"><span className="help-eyebrow">QUICK ANSWERS</span><h2>A few things you might be wondering</h2><div className="mt-6">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<ChevronRight className="size-4 shrink-0" /></summary><p>{answer}</p></details>)}</div></section>}
      <footer className="help-support"><LifeBuoy className="size-6 shrink-0" /><div><h2>Still need a hand?</h2><p>Contact your gym administrator with the page name, what you tried, and the error shown. Keep passwords, OTPs and private member details out of screenshots.</p></div></footer>
    </main>
  </div>
}
