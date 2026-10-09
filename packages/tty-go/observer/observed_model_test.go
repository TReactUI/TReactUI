package observer

import (
	"testing"

	tea "charm.land/bubbletea/v2"

	"github.com/meta-tui/treactui/packages/tty-go/protocol"
)

type counter struct{ n int }

func (c counter) Init() tea.Cmd { return nil }
func (c counter) View() tea.View  { return tea.NewView("") }
func (c counter) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	if _, ok := msg.(tea.KeyPressMsg); ok {
		c.n++
	}
	return c, nil
}
func (c counter) Accessible() protocol.Snapshot {
	return protocol.Snapshot{Title: "Counter", Nodes: []protocol.A11yNode{{Role: "text", Label: string(rune('0' + c.n))}}}
}

func TestSnapshotIsSentOnlyWhenItChanges(t *testing.T) {
	var frames []protocol.ServerFrame
	model := Observe(counter{}, func(f protocol.ServerFrame) { frames = append(frames, f) })

	model.Init()                      // first snapshot
	model.Update(tea.WindowSizeMsg{}) // unchanged: no frame
	model.Update(tea.KeyPressMsg{}) // changed: second frame

	if len(frames) != 2 {
		t.Fatalf("want 2 snapshot frames, got %d", len(frames))
	}
}

func TestAnnounceAndEventAreTurnedIntoFrames(t *testing.T) {
	var frames []protocol.ServerFrame
	model := Observe(counter{}, func(f protocol.ServerFrame) { frames = append(frames, f) })

	model.Update(protocol.AnnounceMsg{Text: "Done", Assertive: true})
	model.Update(protocol.EventMsg{Name: "open-file"})

	if len(frames) != 2 || frames[0].Politeness != "assertive" || frames[1].Name != "open-file" {
		t.Fatalf("unexpected frames %+v", frames)
	}
}
