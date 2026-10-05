package ttygo

import "github.com/TReactUI/TReactUI/packages/tty-go/protocol"

// The types a model uses to talk to the page, re-exported so a program
// imports one package.
type (
	// Accessible lets a model describe its screen for assistive technology.
	Accessible = protocol.Accessible
	// Snapshot is the description a model returns from Accessible.
	Snapshot = protocol.Snapshot
	// A11yNode is one element of a Snapshot.
	A11yNode = protocol.A11yNode
	// AnnounceMsg, returned from a command, makes screen readers read Text.
	AnnounceMsg = protocol.AnnounceMsg
	// EventMsg, returned from a command, sends a web-only action to the page.
	EventMsg = protocol.EventMsg
)
