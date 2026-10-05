package session

import (
	"context"
	"io"
	"sync"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/TReactUI/TReactUI/packages/tty-go/observer"
	"github.com/TReactUI/TReactUI/packages/tty-go/protocol"
)

// Run drives a fresh program from newModel over t until the browser leaves or
// the program quits. Keystrokes arrive as terminal input, resizes as
// tea.WindowSizeMsg, and the program's output goes back as output frames.
func Run(ctx context.Context, t Transport, newModel func() tea.Model) error {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	var writing sync.Mutex
	send := func(frame protocol.ServerFrame) {
		encoded, err := protocol.EncodeServerFrame(frame)
		if err != nil {
			return
		}
		writing.Lock()
		defer writing.Unlock()
		_ = t.Write(ctx, encoded)
	}
	send(protocol.NewHelloFrame())

	input, typed := io.Pipe()
	program := tea.NewProgram(
		observer.Observe(newModel(), send),
		tea.WithInput(input),
		tea.WithOutput(outputWriter(func(p []byte) { send(protocol.NewOutputFrame(string(p))) })),
		tea.WithContext(ctx),
		tea.WithoutSignalHandler(),
	)

	finished := make(chan error, 1)
	go func() {
		_, err := program.Run()
		finished <- err
	}()

	go func() {
		defer func() { _ = typed.Close(); program.Quit() }()
		for {
			frame, err := t.Read(ctx)
			if err != nil {
				return
			}
			msg, err := protocol.DecodeClientMessage(frame)
			if err != nil {
				continue
			}
			switch msg.Type {
			case "input":
				_, _ = typed.Write([]byte(msg.Data))
			case "resize":
				program.Send(tea.WindowSizeMsg{Width: msg.Cols, Height: msg.Rows})
			}
		}
	}()

	return <-finished
}

type outputWriter func(p []byte)

func (w outputWriter) Write(p []byte) (int, error) {
	w(p)
	return len(p), nil
}
