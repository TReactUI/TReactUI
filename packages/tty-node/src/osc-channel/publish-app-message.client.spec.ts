import { createAppMessageExtractor } from './app-message-extractor.store'
import { announce, publishSnapshot } from './publish-app-message.client'

const underTty = { TREACT_TTY: '1' }

describe('publishing from the served program', () => {
  it('writes a message the adapter can extract', () => {
    const written: string[] = []
    announce('Done', 'assertive', { write: text => { written.push(text) } }, underTty)
    publishSnapshot({ title: 'Tasks', nodes: [] }, { write: text => { written.push(text) } }, underTty)

    const { output, messages } = createAppMessageExtractor().push(written.join(''))

    expect(output).toBe('')
    expect(messages.map(message => JSON.parse(message))).toEqual([
      { type: 'announce', text: 'Done', politeness: 'assertive' },
      { type: 'a11y-snapshot', snapshot: { title: 'Tasks', nodes: [] } },
    ])
  })

  it('does nothing outside the adapter, so the program still works in a real terminal', () => {
    const write = jest.fn()

    announce('Done', 'polite', { write }, {})

    expect(write).not.toHaveBeenCalled()
  })
})
