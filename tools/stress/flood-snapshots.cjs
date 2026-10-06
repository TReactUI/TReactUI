// A program that describes its screen, and announces, far more often than a person could follow.
//   node flood-snapshots.cjs [perSecond=200] [seconds=10] [options=50] [announce]
// Each snapshot is a listbox of `options` entries whose selection moves; with `announce` it also announces each one.
// It prints a line per second and DONE at the end, and waits for the letter g and Enter before starting.
const { announce, publishSnapshot } = require('../../packages/tty-node/dist/index.esm.js')

const perSecond = Number(process.argv[2] ?? 200)
const seconds = Number(process.argv[3] ?? 10)
const options = Number(process.argv[4] ?? 50)
const alsoAnnounce = process.argv[5] === 'announce'

function snapshotAt (selected) {
  return {
    title: 'Stress',
    nodes: [
      { role: 'heading', value: 'Stress' },
      { role: 'status', value: `selected ${selected + 1} of ${options}` },
      {
        role:     'listbox',
        label:    'Items',
        children: Array.from({ length: options }, (_, index) => ({ role: 'option', label: `Item ${index + 1}`, selected: index === selected, focused: index === selected })),
      },
    ],
  }
}

function run () {
  const total = perSecond * seconds
  let sent = 0
  const timer = setInterval(() => {
    for (let count = 0; count < Math.max(1, Math.round(perSecond / 50)) && sent < total; count++, sent++) {
      publishSnapshot(snapshotAt(sent % options))
      if (alsoAnnounce) announce(`Item ${(sent % options) + 1}`)
    }
    if (sent % perSecond < perSecond / 50) process.stdout.write(`sent ${sent} of ${total}\r\n`)
    if (sent >= total) {
      clearInterval(timer)
      process.stdout.write(`DONE ${total}\r\n`)
    }
  }, 20)
}

let started = false
process.stdin.on('data', data => {
  if (started || !String(data).includes('g')) return
  started = true
  run()
})
