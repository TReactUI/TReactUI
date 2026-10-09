package session

import (
	"context"
	"io"
	"sync"

	tea "charm.land/bubbletea/v2"

	"github.com/meta-tui/treactui/packages/tty-go/observer"
	"github.com/meta-tui/treactui/packages/tty-go/protocol"
)

// SharedProgram is one Bubble Tea program that any number of browsers watch
// and type into at once, like a tmux session. It starts when the first browser
// connects and keeps running when every browser has left, so a reload, or a
// second window, finds it as it was. When the program quits, the next browser
// to connect starts a new one.
//
// Everyone sees the same screen at the size of the latest resize, and anyone's
// keystrokes reach the program.
type SharedProgram struct {
	newModel func() tea.Model

	mu      sync.Mutex
	running *sharedRun
}

// NewSharedProgram prepares a shared program; newModel is called each time one starts.
func NewSharedProgram(newModel func() tea.Model) *SharedProgram {
	return &SharedProgram{newModel: newModel}
}

// Attach connects one browser to the program, starting it if none is running,
// and returns when the browser leaves or the program quits.
func (s *SharedProgram) Attach(ctx context.Context, t Transport) error {
	run := s.start()
	viewer := &sharedViewer{ctx: ctx, transport: t}
	run.join(viewer)
	defer run.leave(viewer)

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	go func() {
		select {
		case <-run.finished:
			cancel()
		case <-ctx.Done():
		}
	}()

	for {
		frame, err := t.Read(ctx)
		if err != nil {
			return nil
		}
		msg, err := protocol.DecodeClientMessage(frame)
		if err != nil {
			continue
		}
		switch msg.Type {
		case "input":
			_, _ = run.typed.Write([]byte(msg.Data))
		case "resize":
			run.resize(tea.WindowSizeMsg{Width: msg.Cols, Height: msg.Rows})
		}
	}
}

// Send delivers msg to the running program, as if a browser had caused it, and
// reports whether a program was running. It is for the process that hosts the
// program (a desktop window, a tray app) to talk to it: for example to send
// the key that starts the program's own quit flow when the window is closed.
func (s *SharedProgram) Send(msg tea.Msg) bool {
	s.mu.Lock()
	run := s.running
	s.mu.Unlock()
	if run == nil {
		return false
	}
	run.program.Send(msg)
	return true
}

// start returns the running program, or starts a new one.
func (s *SharedProgram) start() *sharedRun {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.running != nil {
		return s.running
	}

	input, typed := io.Pipe()
	run := &sharedRun{window: &windowSize{}, typed: typed, modes: newModeTracker(), viewers: map[*sharedViewer]struct{}{}, finished: make(chan struct{})}
	run.program = tea.NewProgram(
		observer.Observe(s.newModel(), run.broadcast),
		append(programOptions(run.window),
			tea.WithInput(input),
			tea.WithOutput(outputWriter(func(p []byte) { run.broadcast(protocol.NewOutputFrame(string(p))) })),
			tea.WithContext(context.Background()),
		)...,
	)
	s.running = run

	go func() {
		_, _ = run.program.Run()
		_ = typed.Close()
		s.mu.Lock()
		if s.running == run {
			s.running = nil
		}
		s.mu.Unlock()
		close(run.finished)
	}()
	return run
}

// sharedRun is one start of the program and the browsers watching it.
type sharedRun struct {
	program  *tea.Program
	typed    *io.PipeWriter
	finished chan struct{}

	mu       sync.Mutex // guards what follows, and serialises writes to the browsers
	viewers  map[*sharedViewer]struct{}
	// modes follows the terminal modes the program has switched on (alternate
	// screen, mouse reporting, bracketed paste, cursor) so a browser that joins
	// late can be put in the same state.
	modes *modeTracker
	window   *windowSize // the size the latest resize asked for
	snapshot *protocol.ServerFrame // the latest accessibility snapshot
}

type sharedViewer struct {
	ctx       context.Context
	transport Transport
}

// join sends the browser what it missed and adds it to the audience. The
// snapshot is read and the browser registered under one lock, so it cannot miss
// a change in between.
func (r *sharedRun) join(v *sharedViewer) {
	r.mu.Lock()
	r.sendTo(v, protocol.NewHelloFrame())
	if replay := r.modes.replay(); replay != "" {
		r.sendTo(v, protocol.NewOutputFrame(replay))
	}
	if r.snapshot != nil {
		r.sendTo(v, *r.snapshot)
	}
	r.viewers[v] = struct{}{}
	size, known := r.window.get()
	r.mu.Unlock()

	// Sending the size again makes Bubble Tea draw the whole screen, which the
	// new browser has not seen.
	if known {
		r.program.Send(size)
	}
}

func (r *sharedRun) leave(v *sharedViewer) {
	r.mu.Lock()
	delete(r.viewers, v)
	r.mu.Unlock()
}

func (r *sharedRun) resize(size tea.WindowSizeMsg) {
	r.mu.Lock()
	r.window.set(size)
	r.mu.Unlock()
	r.program.Send(size)
}

// broadcast sends a frame to every browser watching, and remembers the latest snapshot.
func (r *sharedRun) broadcast(frame protocol.ServerFrame) {
	r.mu.Lock()
	defer r.mu.Unlock()
	switch frame.Type {
	case "a11y-snapshot":
		r.snapshot = &frame
	case "output":
		r.modes.feed([]byte(frame.Data))
	}
	for v := range r.viewers {
		r.sendTo(v, frame)
	}
}

// sendTo writes one frame; r.mu must be held. A browser that cannot be written to is dropped.
func (r *sharedRun) sendTo(v *sharedViewer, frame protocol.ServerFrame) {
	encoded, err := protocol.EncodeServerFrame(frame)
	if err != nil {
		return
	}
	if err := v.transport.Write(v.ctx, encoded); err != nil {
		delete(r.viewers, v)
	}
}
