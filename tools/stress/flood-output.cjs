// A program that prints a lot, to stress a served terminal.
//   node flood-output.cjs [lines=100000] [width=80] [perSecond=0 (as fast as possible)] [wait]
// With `wait`, it prints nothing until the letter g is typed, so a page can be measured from the first line.
// It prints numbered lines, so a reader can tell what arrived and in what order, then DONE.
const lines = Number(process.argv[2] ?? 100_000)
const width = Number(process.argv[3] ?? 80)
const perSecond = Number(process.argv[4] ?? 0)
const waitForTrigger = process.argv[5] === 'wait'

const pad = 'x'.repeat(Math.max(0, width - 14))
const batch = perSecond === 0 ? 500 : Math.max(1, Math.round(perSecond / 50))
let next = 1

function writeBatch () {
  let text = ''
  for (let count = 0; count < batch && next <= lines; count++, next++) text += `line ${String(next).padStart(7, '0')} ${pad}\r\n`
  if (text !== '') process.stdout.write(text)

  if (next > lines) {
    process.stdout.write(`DONE ${lines}\r\n`)
    // Keep the session open, so the page can be inspected after the output.
    process.stdin.resume()

    return
  }
  if (perSecond === 0) setImmediate(writeBatch)
  else setTimeout(writeBatch, 20)
}

let started = !waitForTrigger
if (started) writeBatch()
process.stdin.on('data', data => {
  if (started || !String(data).includes('g')) return
  started = true
  writeBatch()
})
