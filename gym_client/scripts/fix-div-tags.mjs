import fs from 'fs'

const tag = 'div'
const open = '<' + tag
const close = '</' + tag + '>'

for (const p of process.argv.slice(2)) {
  let c = fs.readFileSync(p, 'utf8')
  c = c.replaceAll('<motion', open)
  c = c.replaceAll('</motion>', close)
  c = c.replaceAll(open + '>\n          className=', open + ' className=')
  fs.writeFileSync(p, c)
}
