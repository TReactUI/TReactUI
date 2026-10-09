// Package observer wraps a Bubble Tea model so the browser learns what the
// model describes, announces and requests, without the model knowing about
// the transport.
package observer

import (
	"encoding/json"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/meta-tui/treactui/packages/tty-go/protocol"
)

// Observe wraps inner. After every update it sends an accessibility snapshot
// when inner implements protocol.Accessible and the snapshot changed, and it
// turns AnnounceMsg and EventMsg into frames instead of forwarding them.
func Observe(inner tea.Model, send func(protocol.ServerFrame)) tea.Model {
	return &observedModel{inner: inner, send: send}
}

type observedModel struct {
	inner tea.Model
	send  func(protocol.ServerFrame)
	last  string
}

func (m *observedModel) Init() tea.Cmd {
	m.publish()
	return m.inner.Init()
}

func (m *observedModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch typed := msg.(type) {
	case protocol.AnnounceMsg:
		m.send(protocol.NewAnnounceFrame(typed))
		return m, nil
	case protocol.EventMsg:
		m.send(protocol.NewEventFrame(typed))
		return m, nil
	}
	next, cmd := m.inner.Update(msg)
	m.inner = next
	m.publish()
	return m, cmd
}

func (m *observedModel) View() string { return m.inner.View() }

func (m *observedModel) publish() {
	accessible, ok := m.inner.(protocol.Accessible)
	if !ok {
		return
	}
	frame := protocol.NewSnapshotFrame(accessible.Accessible())
	encoded, err := json.Marshal(frame.Snapshot)
	if err != nil || string(encoded) == m.last {
		return
	}
	m.last = string(encoded)
	m.send(frame)
}
