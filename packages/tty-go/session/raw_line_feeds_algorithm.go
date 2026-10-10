package session

import (
	"runtime"
	"strings"
)

// indexRow is IND (ESC D): move down one row, keeping the column, scrolling at
// the bottom.
const indexRow = "\x1bD"

// rawLineFeeds makes a Bubble Tea frame mean to the page what Bubble Tea meant.
//
// Bubble Tea v2 decides what a bare "\n" means in its output from the OS it
// runs on (tea.go: mapNl := runtime.GOOS != "windows" && p.ttyInput == nil):
//
//   - Everywhere but Windows it takes "\n" to also return to column 0, as a
//     terminal in cooked mode does, and positions the next cell from there.
//   - On Windows it takes "\n" to move down and keep the column.
//
// The page's terminal (xterm.js, as set up by @treactui/tty) turns "\n" into
// "\r\n" (convertEol), which is right for the first case and wrong for the
// second. So the frame is rewritten to say what Bubble Tea meant without
// depending on that setting: "\r\n" for the first, and IND for the second,
// which convertEol leaves alone.
func rawLineFeeds(output []byte) string {
	return lineFeeds(string(output), runtime.GOOS == "windows")
}

// lineFeeds rewrites every bare line feed: as IND when keepColumn (Bubble Tea
// took the line feed to keep the column), otherwise as a carriage return and a
// line feed. A "\r\n" the program wrote itself is kept in the second case and
// loses its "\r" in the first, where IND moves down on its own.
func lineFeeds(output string, keepColumn bool) string {
	if keepColumn {
		return strings.ReplaceAll(output, "\n", indexRow)
	}
	return strings.ReplaceAll(strings.ReplaceAll(output, "\r\n", "\n"), "\n", "\r\n")
}
