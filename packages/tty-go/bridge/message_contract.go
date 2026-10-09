package bridge

// The kinds of message that cross the bridge.
const (
	kindOpen  = "open"  // up: a page connects; down: not used
	kindFrame = "frame" // a protocol frame, in either direction
	kindClose = "close" // up: the page leaves; down: the program ended
)

// message is what an event holds, in either direction. Conn names one connection of a page
// (a reload makes a new one), and Seq numbers the messages of that connection from 0, so
// the receiver can put them back in order. Frame is the protocol frame of a "frame" message.
type message struct {
	Conn  string `json:"c"`
	Seq   int    `json:"n"`
	Kind  string `json:"t"`
	Frame string `json:"f,omitempty"`
}
