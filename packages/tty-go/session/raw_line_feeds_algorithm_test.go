package session

import (
	"runtime"
	"strings"
	"testing"

	tea "charm.land/bubbletea/v2"
	"github.com/meta-tui/treactui/packages/tty-go/protocol"
)

func TestWhereBubbleTeaKeepsTheColumnALineFeedBecomesIndex(t *testing.T) {
	got := lineFeeds("a\r\nb\nc", true)
	if got != "a\r\x1bDb\x1bDc" {
		t.Fatalf("got %q", got)
	}
	if strings.Contains(got, "\n") {
		t.Fatal("no line feed may remain")
	}
}

func TestWhereBubbleTeaReturnsToColumnZeroALineFeedBecomesCarriageReturnAndLineFeed(t *testing.T) {
	got := lineFeeds("a\r\nb\nc", false)
	if got != "a\r\nb\r\nc" {
		t.Fatalf("got %q", got)
	}
	if strings.Contains(strings.ReplaceAll(got, "\r\n", ""), "\n") {
		t.Fatal("a bare line feed remains")
	}
}

func TestLineFeedsLeaveOtherOutputAlone(t *testing.T) {
	in := "\x1b[1;2H\x1b[38;5;212mhi\x1b[m"
	for _, keep := range []bool{true, false} {
		if got := lineFeeds(in, keep); got != in {
			t.Fatalf("keepColumn=%v: got %q", keep, got)
		}
	}
}

func TestTheRewriteFollowsTheOperatingSystemLikeBubbleTea(t *testing.T) {
	got := rawLineFeeds([]byte("a\nb"))
	want := "a\r\nb"
	if runtime.GOOS == "windows" {
		want = "a\x1bDb"
	}
	if got != want {
		t.Fatalf("on %s: got %q, want %q", runtime.GOOS, got, want)
	}
}

// twoRows draws on two rows, so Bubble Tea has to move down a row.
type twoRows struct{}

func (twoRows) Init() tea.Cmd                         { return nil }
func (r twoRows) Update(tea.Msg) (tea.Model, tea.Cmd) { return r, nil }
func (twoRows) View() tea.View                        { return tea.NewView("first\nsecond") }

func TestFramesSentToTheBrowserHaveNoBareLineFeeds(t *testing.T) {
	shared := NewSharedProgram(func() tea.Model { return twoRows{} })
	browser := &memoryTransport{incoming: make(chan []byte, 8)}
	cancel, _ := attach(shared, browser)
	defer cancel()
	send(t, browser, protocol.ClientMessage{Type: "resize", Cols: 80, Rows: 24})
	waitFor(t, browser, "second")

	for _, frame := range browser.frames() {
		// A frame is JSON, so a line feed shows as the two characters \n. A
		// "\r\n" is what a program that returns to column 0 gets; a bare line
		// feed would be turned into one by the page, whatever it meant.
		if strings.Contains(strings.ReplaceAll(frame, `\r\n`, ""), `\n`) {
			t.Fatalf("frame carries a bare line feed: %s", frame)
		}
	}
}
