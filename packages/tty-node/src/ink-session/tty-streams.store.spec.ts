import { createTtyStreams } from './tty-streams.store'

describe('createTtyStreams', () => {
  it('looks like a terminal of the given size, and reports a resize through the event', () => {
    const streams = createTtyStreams({ cols: 80, rows: 24 }, jest.fn())
    const onResize = jest.fn()
    streams.stdout.on('resize', onResize)

    expect(streams.stdout.isTTY).toBe(true)
    expect([streams.stdout.columns, streams.stdout.rows]).toEqual([80, 24])

    streams.resize(120, 40)

    expect([streams.stdout.columns, streams.stdout.rows]).toEqual([120, 40])
    expect(onResize).toHaveBeenCalledTimes(1)
  })

  it('sends whatever the program writes to the output handler', () => {
    const onOutput = jest.fn()
    const streams = createTtyStreams({ cols: 80, rows: 24 }, onOutput)

    streams.stdout.write('hello')

    expect(onOutput).toHaveBeenCalledWith('hello')
  })

  it('offers typed input to the program, and accepts raw mode', async () => {
    const streams = createTtyStreams({ cols: 80, rows: 24 }, jest.fn())
    const received = new Promise<string>(resolve => streams.stdin.once('data', data => resolve(String(data))))

    streams.stdin.setRawMode(true)
    streams.input('a')

    expect(await received).toBe('a')
    expect(streams.stdin.isRaw).toBe(true)
  })
})
