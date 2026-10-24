import { Fragment } from 'react'

function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>)
}

/** Small, safe renderer for the headings, paragraphs and lists used in help content. */
export function HelpArticleBody({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n')
  const blocks = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    if (/^#{1,3} /.test(line)) {
      blocks.push(<h3 key={i}>{inline(line.replace(/^#{1,3} /, ''))}</h3>)
    } else if (/^(\d+\. |[-*] )/.test(line)) {
      const ordered = /^\d+\. /.test(line)
      const items = []
      const start = i
      while (i < lines.length && (ordered ? /^\d+\. / : /^[-*] /).test(lines[i].trim())) {
        items.push(<li key={i}>{inline(lines[i].trim().replace(/^(\d+\. |[-*] )/, ''))}</li>)
        i++
      }
      i--
      blocks.push(ordered ? <ol key={start}>{items}</ol> : <ul key={start}>{items}</ul>)
    } else {
      blocks.push(<p key={i}>{inline(line)}</p>)
    }
  }
  return <div className="help-prose">{blocks}</div>
}
