// A browser stand-in that stops reading: connects, reports its size, pauses the socket, and watches what the
// server does with the output it cannot deliver. When it reads again it checks that nothing was lost.
//   node slow-reader.cjs <port> <serverPid> [secondsNotReading=20]
// The served program is flood-output.cjs, whose lines are numbered.
const { execFileSync } = require('node:child_process')
const { WebSocket } = require('ws')

const [port, serverPid, seconds = '20'] = process.argv.slice(2)

const rssMb = () => {
  const output = execFileSync('powershell', ['-NoProfile', '-Command', `(Get-Process -Id ${serverPid}).WorkingSet64`], { encoding: 'utf8' })

  return Math.round(Number(output.trim()) / 1024 / 1024)
}

// What arrived, checked as it comes: a numbered line must follow the one before it, and DONE must end it.
let carry = ''
let lastLine = 0
let outOfOrder = 0
let done
let bytes = 0
const LINE = /line (\d{7}) /g

function check (text) {
  const joined = carry + text
  const cut = joined.lastIndexOf('\n')
  carry = cut === -1 ? joined : joined.slice(cut + 1)
  const complete = cut === -1 ? '' : joined.slice(0, cut + 1)
  for (const match of complete.matchAll(LINE)) {
    const number = Number(match[1])
    if (number !== lastLine + 1) outOfOrder++
    lastLine = number
  }
  const finished = /DONE (\d+)/.exec(complete)
  if (finished) done = Number(finished[1])
}

const socket = new WebSocket(`ws://127.0.0.1:${port}/term`)
socket.on('message', data => {
  const message = JSON.parse(String(data))
  if (message.type === 'output') {
    bytes += message.data.length
    check(message.data)
  }
})
socket.on('open', () => {
  socket.send(JSON.stringify({ type: 'resize', cols: 100, rows: 30 }))
  // The first output only starts after ConPTY's start-up query times out, because this client does not answer it.
  setTimeout(() => {
    console.log(`baseline: server ${rssMb()} MB`)
    socket._socket.pause()
    console.log('--- the client stops reading ---')
    const started = Date.now()
    const timer = setInterval(() => {
      const elapsed = Math.round((Date.now() - started) / 1000)
      console.log(`  ${String(elapsed).padStart(2)} s  server memory ${rssMb()} MB`)
      if (elapsed >= Number(seconds)) {
        clearInterval(timer)
        console.log('--- the client reads again ---')
        socket._socket.resume()
        const waited = setInterval(() => {
          if (done !== undefined) {
            clearInterval(waited)
            console.log(`received ${Math.round(bytes / 1024 / 1024)} MB: last line ${lastLine}, DONE says ${done}, lines out of order: ${outOfOrder}, server ${rssMb()} MB`)
            console.log(lastLine === done && outOfOrder === 0 ? 'INTEGRITY OK: nothing lost, nothing reordered' : 'INTEGRITY FAILED')
            socket.close()
            process.exit(0)
          }
        }, 500)
        setTimeout(() => { console.log(`gave up waiting: last line ${lastLine}, DONE ${done}`); process.exit(1) }, 120_000)
      }
    }, 2000)
  }, 100)
})
socket.on('error', error => { console.log('error', error.message); process.exit(1) })
