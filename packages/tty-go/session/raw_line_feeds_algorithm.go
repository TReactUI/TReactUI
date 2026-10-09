package session

import "strings"

// indexRow is IND (ESC D): move down one row, keeping the column, scrolling at
// the bottom. It is what a line feed does on a terminal in raw mode.
const indexRow = "\x1bD"

// rawLineFeeds rewrites each line feed as IND.
//
// Bubble Tea v2 writes a bare "\n" to mean "down one row, same column" and
// positions the next cell relative to that. The page's terminal (xterm.js, as
// set up by @treactui/tty) turns "\n" into "\r\n" (convertEol, which Bubble Tea
// v1 relied on), so the cursor would jump to column 0 and the text after it
// would land in the wrong place. convertEol only touches the line feed
// character, so IND passes through unchanged and moves the cursor as the
// program intended.
func rawLineFeeds(output []byte) string {
	return strings.ReplaceAll(string(output), "\n", indexRow)
}
