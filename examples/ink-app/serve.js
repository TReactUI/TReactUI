// An Ink app served to @trectui/tty at ws://localhost:8080/term, rendered in this
// process: no PTY, no native module. Each browser gets its own instance.
import { serveInk } from '@trectui/tty-node'
import { Box, Text, render, useInput } from 'ink'
import { createElement as h, useState } from 'react'

const PEOPLE = ['Ada', 'Grace', 'Linus']

/** `announce` and `publishSnapshot` come from the session: they speak to the page directly. */
function App ({ announce, publishSnapshot }) {
  const [selected, setSelected] = useState(0)
  const [greeted, setGreeted] = useState([])

  const describe = (index, done) => publishSnapshot({
    title: 'People',
    nodes: [{
      role: 'listbox',
      label: 'People',
      children: PEOPLE.map((name, i) => ({ role: 'option', label: done.includes(name) ? `${name}, greeted` : name, selected: i === index })),
    }],
  })

  useInput((input, key) => {
    if (key.upArrow || key.downArrow) {
      const next = Math.max(0, Math.min(PEOPLE.length - 1, selected + (key.downArrow ? 1 : -1)))
      setSelected(next)
      describe(next, greeted)
    } else if (key.return) {
      const done = [...new Set([...greeted, PEOPLE[selected]])]
      setGreeted(done)
      announce(`Greeted ${PEOPLE[selected]}`)
      describe(selected, done)
    }
  })

  return h(Box, { flexDirection: 'column', borderStyle: 'round', paddingX: 1 },
    h(Text, { bold: true, color: 'cyan' }, 'Greet someone'),
    ...PEOPLE.map((name, i) => h(Text, { key: name, inverse: i === selected }, `${greeted.includes(name) ? '[x]' : '[ ]'} ${name}`)),
    h(Text, { dimColor: true }, 'up/down move, enter greets'))
}

const server = await serveInk({
  port: 8080,
  allowedOrigins: ['localhost:4200'],
  render: ({ stdin, stdout, announce, publishSnapshot }) =>
    render(h(App, { announce, publishSnapshot }), { stdin, stdout, patchConsole: false, exitOnCtrlC: false }),
})

console.log(`serving the Ink app at ws://localhost:${server.port}/term`)
