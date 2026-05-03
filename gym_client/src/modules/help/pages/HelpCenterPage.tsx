import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { authService } from '../../../services/auth.service'
import { HelpButton } from '../components/HelpButton'
import { useHelpArticleDetail, useHelpArticles, useHelpCategories } from '../hooks/useHelp'

function renderMarkdownLite(md: string) {
  const lines = md.split('\n')
  return lines.map((line, i) => {
    const t = line.trim()
    if (t.startsWith('## ')) {
      return (
        <h3 key={i} className="mt-4 text-base font-semibold text-white first:mt-0">
          {t.slice(3)}
        </h3>
      )
    }
    if (!t) return <div key={i} className="h-2" />
    return (
      <p key={i} className="text-sm leading-relaxed text-slate-300">
        {line}
      </p>
    )
  })
}

export function HelpCenterPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryId = searchParams.get('category') ?? ''
  const articleParam = searchParams.get('article') ?? ''
  const qParam = searchParams.get('q') ?? ''
  const [qInput, setQInput] = useState(qParam)

  const { data: categories = [], isLoading: catLoading } = useHelpCategories()
  const selectedCategory = useMemo(() => {
    if (categoryId) return categoryId
    const first = categories[0]?.id
    return first ?? ''
  }, [categoryId, categories])

  const { data: articles = [], isLoading: artLoading } = useHelpArticles(
    selectedCategory || undefined,
    qParam || undefined,
  )
  const { data: articleDetail, isLoading: detailLoading } = useHelpArticleDetail(
    articleParam || null,
  )

  useEffect(() => {
    if (!authService.getAccessToken()) {
      navigate('/login', { replace: true, state: { from: '/help' } })
    }
  }, [navigate])

  useEffect(() => {
    if (!categories.length || categoryId) return
    setSearchParams(new URLSearchParams({ category: categories[0]!.id }), { replace: true })
  }, [categories, categoryId, setSearchParams])

  const setCategory = (id: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('category', id)
    next.delete('article')
    setSearchParams(next)
  }

  const setArticle = (id: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('article', id)
    setSearchParams(next)
  }

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const next = new URLSearchParams(searchParams)
    if (qInput.trim()) next.set('q', qInput.trim())
    else next.delete('q')
    setSearchParams(next)
  }

  return (
    <div className="relative min-h-screen bg-[#070712] text-slate-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-90"
      >
        <div className="absolute -top-24 left-0 size-[28rem] rounded-full bg-blue-600/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 size-[24rem] rounded-full bg-violet-600/12 blur-3xl" />
      </div>

      <header className="sticky top-0 z-20 border-b border-white/5 bg-[rgba(7,7,18,0.75)] px-4 py-4 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/5"
            >
              ← Dashboard
            </Link>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Help Center</p>
              <h1 className="text-lg font-bold text-white">Guides for gym owners</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HelpButton moduleKey="help_center" size="sm" />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 lg:flex-row lg:px-8">
        <aside className="w-full shrink-0 space-y-3 lg:w-56">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Categories</p>
          <nav className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-2 shadow-lg shadow-black/20">
            {catLoading && <p className="px-3 py-2 text-sm text-slate-400">Loading…</p>}
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                  selectedCategory === c.id
                    ? 'bg-gradient-to-r from-blue-500/25 to-violet-500/20 text-white shadow-inner shadow-white/5'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                {c.name}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 space-y-4">
          <form
            onSubmit={submitSearch}
            className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-md shadow-black/20"
          >
            <Search className="size-4 text-slate-500" />
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search articles…"
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              data-help-ignore-shortcut
            />
            <button
              type="submit"
              className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
            >
              Search
            </button>
          </form>

          <div className="grid min-h-[420px] gap-4 lg:grid-cols-5">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-lg shadow-black/25 lg:col-span-2">
              <h2 className="text-sm font-semibold text-white">Articles</h2>
              <p className="mt-1 text-xs text-slate-500">In “{categories.find((c) => c.id === selectedCategory)?.name ?? '—'}”</p>
              <ul className="mt-4 space-y-1">
                {artLoading && <li className="text-sm text-slate-400">Loading…</li>}
                {!artLoading &&
                  articles.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => setArticle(a.id)}
                        className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${
                          articleParam === a.id
                            ? 'bg-white/10 text-white'
                            : 'text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <span className="font-medium">{a.title}</span>
                        {a.summary ? (
                          <span className="mt-0.5 block text-xs text-slate-500">{a.summary}</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                {!artLoading && articles.length === 0 && (
                  <li className="text-sm text-slate-400">No articles match your filters.</li>
                )}
              </ul>
            </section>

            <motion.section
              layout
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/30 lg:col-span-3"
            >
              {!articleParam && (
                <p className="text-sm text-slate-400">Select an article to read the full guide.</p>
              )}
              {articleParam && detailLoading && <p className="text-sm text-slate-400">Loading article…</p>}
              {articleParam && !detailLoading && !articleDetail && (
                <p className="text-sm text-amber-200/90">Article not found.</p>
              )}
              {articleDetail && (
                <article>
                  <h2 className="text-xl font-bold text-white">{articleDetail.title}</h2>
                  {articleDetail.summary && (
                    <p className="mt-2 text-sm text-slate-400">{articleDetail.summary}</p>
                  )}
                  <div className="mt-6 space-y-2 border-t border-white/5 pt-6">
                    {renderMarkdownLite(articleDetail.bodyMarkdown)}
                  </div>
                </article>
              )}
            </motion.section>
          </div>
        </main>
      </div>
    </div>
  )
}
