package session

import (
	"strings"
	"testing"

	tea "charm.land/bubbletea/v2"
	"github.com/meta-tui/treactui/packages/tty-go/protocol"
)

func TestRawLineFeedsBecomeIndex(t *testing.T) {
	got := rawLineFeeds([]byte("a\r\nb\nc"))
	if got != "a\r\x1bDb\x1bDc" {
		t.Fatalf("got %q", got)
	}
	if strings.Contains(got, "\n") {
		t.Fatal("no bare line feed may remain")
	}
}

func TestRawLineFeedsLeaveOtherOutputAlone(t *testing.T) {
	in := "\x1b[1;2H\x1b[38;5;212mhi\x1b[m"
	if got := rawLineFeeds([]byte(in)); got != in {
		t.Fatalf("got %q", got)
	}
}

// twoRows draws on two rows, so Bubble Tea has to move down a row.
type twoRows struct{}

func (twoRows) Init() tea.Cmd                       { return nil }
func (r twoRows) Update(tea.Msg) (tea.Model, tea.Cmd) { return r, nil }
func (twoRows) View() tea.View                      { return tea.NewView("first\nsecond") }

func TestFramesSentToTheBrowserHaveNoBareLineFeeds(t *testing.T) {
	shared := NewSharedProgram(func() tea.Model { return twoRows{} })
	browser := &memoryTransport{incoming: make(chan []byte, 8)}
	cancel, _ := attach(shared, browser)
	defer cancel()
	send(t, browser, protocol.ClientMessage{Type: "resize", Cols: 80, Rows: 24})
	waitFor(t, browser, "second")

	for _, frame := range browser.frames() {
		if strings.Contains(frame, `\n`) {
			t.Fatalf("frame carries a line feed: %s", frame)
		}
	}
}
