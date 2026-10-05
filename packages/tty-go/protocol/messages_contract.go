// Package protocol holds the wire messages shared with the @treactui/tty React
// package: JSON text frames over one WebSocket. It depends on nothing else.
package protocol

// Version is bumped on any incompatible change to the wire messages.
const Version = 1

// A11yNode is one element of the semantic description of a screen.
// Role is an ARIA role: heading, list, listitem, listbox, option, button,
// textbox, progressbar, status or text.
type A11yNode struct {
	Role     string     `json:"role"`
	Label    string     `json:"label,omitempty"`
	Value    string     `json:"value,omitempty"`
	ValueNow *float64   `json:"valueNow,omitempty"`
	Selected bool       `json:"selected,omitempty"`
	Focused  bool       `json:"focused,omitempty"`
	Children []A11yNode `json:"children,omitempty"`
}

// Snapshot is what the TUI currently shows, described for assistive technology.
type Snapshot struct {
	Title string     `json:"title"`
	Nodes []A11yNode `json:"nodes"`
}

// Accessible is implemented by a Bubble Tea model that can describe its screen.
type Accessible interface {
	Accessible() Snapshot
}

// AnnounceMsg, returned from a command, makes screen readers read Text aloud.
type AnnounceMsg struct {
	Text      string
	Assertive bool
}

// EventMsg, returned from a command, sends a web-only action to the host page.
type EventMsg struct {
	Name    string
	Payload any
}

// ServerFrame is a backend-to-browser message. Build one with the New*Frame functions.
type ServerFrame struct {
	Type       string    `json:"type"`
	Version    int       `json:"version,omitempty"`
	Data       string    `json:"data,omitempty"`
	Snapshot   *Snapshot `json:"snapshot,omitempty"`
	Text       string    `json:"text,omitempty"`
	Politeness string    `json:"politeness,omitempty"`
	Name       string    `json:"name,omitempty"`
	Payload    any       `json:"payload,omitempty"`
	// Commands, with Type "commands", is what the browser may run; it then offers a launcher.
	// A pointer, so that an empty list is still sent (omitempty drops an empty slice).
	Commands *[]CommandSpec `json:"commands,omitempty"`
}

// ClientMessage is a browser-to-backend message: "input", "resize", "run" or "stop".
type ClientMessage struct {
	Type string `json:"type"`
	Data string `json:"data,omitempty"`
	Cols int    `json:"cols,omitempty"`
	Rows int    `json:"rows,omitempty"`
	// Command and Args, with Type "run", name one of the offered commands and its arguments.
	Command string   `json:"command,omitempty"`
	Args    []string `json:"args,omitempty"`
}
