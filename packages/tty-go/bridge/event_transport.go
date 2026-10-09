package bridge

import (
	"context"
	"encoding/json"
	"io"
	"sync"
)

// inboxSize is how many frames from the page wait for the program to read them.
const inboxSize = 256

// eventTransport is the session.Transport of one connection: frames from the page arrive
// through deliver, and frames to the page leave as numbered "down" events.
type eventTransport struct {
	events Events
	down   string
	conn   string

	inbox chan []byte
	done  chan struct{}
	once  sync.Once

	mu  sync.Mutex // keeps the numbers and the events in the same order
	seq int
}

func newEventTransport(events Events, down, conn string) *eventTransport {
	return &eventTransport{
		events: events,
		down:   down,
		conn:   conn,
		inbox:  make(chan []byte, inboxSize),
		done:   make(chan struct{}),
	}
}

// Read returns the next frame from the page.
func (t *eventTransport) Read(ctx context.Context) ([]byte, error) {
	select {
	case frame := <-t.inbox:
		return frame, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	case <-t.done:
		return nil, io.EOF
	}
}

// Write sends a frame to the page.
func (t *eventTransport) Write(_ context.Context, frame []byte) error {
	return t.emit(kindFrame, string(frame))
}

// deliver hands a frame from the page to the program, waiting if the program is behind.
func (t *eventTransport) deliver(frame []byte) {
	select {
	case t.inbox <- frame:
	case <-t.done:
	}
}

// sendCloseAfterStop tells the page the program has ended. It is sent after stop, so it
// does not check for it.
func (t *eventTransport) sendCloseAfterStop() {
	t.mu.Lock()
	defer t.mu.Unlock()
	data, err := json.Marshal(message{Conn: t.conn, Seq: t.seq, Kind: kindClose})
	if err != nil {
		return
	}
	t.seq++
	t.events.Emit(t.down, string(data))
}

// stop ends the transport: reads and deliveries stop waiting.
func (t *eventTransport) stop() { t.once.Do(func() { close(t.done) }) }

func (t *eventTransport) emit(kind, frame string) error {
	select {
	case <-t.done:
		return io.ErrClosedPipe
	default:
	}

	t.mu.Lock()
	defer t.mu.Unlock()
	data, err := json.Marshal(message{Conn: t.conn, Seq: t.seq, Kind: kind, Frame: frame})
	if err != nil {
		return err
	}
	t.seq++
	t.events.Emit(t.down, string(data))
	return nil
}
