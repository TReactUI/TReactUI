package bridge

import (
	"context"
	"encoding/json"
	"sync"

	tea "charm.land/bubbletea/v2"

	"github.com/meta-tui/treactui/packages/tty-go/session"
)

// maxTracked bounds how many connections' message order is followed at once: the current
// one, and a few that are about to start or have just been replaced.
const maxTracked = 8

// Shared serves one shared program to the page over events: the page sees and drives the
// program, which keeps running when the page leaves (a reload finds it as it was). It
// serves one connection at a time, the latest to open. The returned function unbinds.
func Shared(ctx context.Context, shared *session.SharedProgram, events Events, options Options) (stop func()) {
	return bind(ctx, shared.Attach, events, options)
}

// Each serves a fresh program from newModel to every connection the page opens. The
// returned function unbinds.
func Each(ctx context.Context, newModel func() tea.Model, events Events, options Options) (stop func()) {
	return bind(ctx, func(c context.Context, t session.Transport) error {
		return session.Run(c, t, newModel)
	}, events, options)
}

type serveFunc func(ctx context.Context, t session.Transport) error

// binding follows the "up" events of the page and runs the connection they open.
type binding struct {
	ctx     context.Context
	events  Events
	options Options
	serve   serveFunc

	// mu is held while a message is put in order and acted on, so two events handled at
	// once cannot hand frames to the program out of order.
	mu         sync.Mutex
	order      []string
	sequencers map[string]*sequencer
	current    *connection
}

type connection struct {
	id        string
	transport *eventTransport
	cancel    context.CancelFunc
}

func bind(ctx context.Context, serve serveFunc, events Events, options Options) (stop func()) {
	ctx, cancel := context.WithCancel(ctx)
	b := &binding{ctx: ctx, events: events, options: options, serve: serve, sequencers: map[string]*sequencer{}}
	off := events.On(options.upEvent(), b.handle)

	return func() {
		off()
		cancel()
		b.mu.Lock()
		defer b.mu.Unlock()
		b.closeCurrent()
	}
}

// handle takes one "up" event.
func (b *binding) handle(data string) {
	var m message
	if json.Unmarshal([]byte(data), &m) != nil || m.Conn == "" {
		return
	}

	b.mu.Lock()
	defer b.mu.Unlock()
	ready, ok := b.sequencerFor(m.Conn).push(m)
	if !ok {
		b.forget(m.Conn)
		return
	}
	for _, next := range ready {
		b.dispatch(next)
	}
}

// dispatch acts on a message that is in its turn; b.mu is held.
func (b *binding) dispatch(m message) {
	switch m.Kind {
	case kindOpen:
		b.closeCurrent()
		b.open(m.Conn)
	case kindFrame:
		if b.current != nil && b.current.id == m.Conn {
			b.current.transport.deliver([]byte(m.Frame))
		}
	case kindClose:
		if b.current != nil && b.current.id == m.Conn {
			b.closeCurrent()
		}
		b.forget(m.Conn)
	}
}

// open starts serving a connection; b.mu is held.
func (b *binding) open(id string) {
	ctx, cancel := context.WithCancel(b.ctx)
	c := &connection{id: id, transport: newEventTransport(b.events, b.options.downEvent(), id), cancel: cancel}
	b.current = c

	go func() {
		_ = b.serve(ctx, c.transport)
		c.transport.stop()
		cancel()

		b.mu.Lock()
		defer b.mu.Unlock()
		if b.current == c {
			// The program ended by itself, not because the page left: say so.
			b.current = nil
			c.transport.sendCloseAfterStop()
		}
	}()
}

// closeCurrent ends the connection being served, if any; b.mu is held.
func (b *binding) closeCurrent() {
	if b.current == nil {
		return
	}
	b.current.cancel()
	b.current.transport.stop()
	b.current = nil
}

func (b *binding) sequencerFor(id string) *sequencer {
	if s, ok := b.sequencers[id]; ok {
		return s
	}
	if len(b.order) >= maxTracked {
		b.forget(b.order[0])
	}
	s := &sequencer{}
	b.sequencers[id] = s
	b.order = append(b.order, id)
	return s
}

func (b *binding) forget(id string) {
	delete(b.sequencers, id)
	for i, known := range b.order {
		if known == id {
			b.order = append(b.order[:i], b.order[i+1:]...)
			break
		}
	}
}
