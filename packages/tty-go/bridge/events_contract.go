package bridge

// Events is the event bus the host offers between the page and Go.
type Events interface {
	// On calls handler with the data of each event called name that the page emits, and
	// returns a function that stops it. Handlers may be called from several goroutines at once.
	On(name string, handler func(data string)) (off func())
	// Emit sends an event called name, with data, to the page.
	Emit(name string, data string)
}

// Options configures a binding.
type Options struct {
	// Prefix names the two events, "<Prefix>:up" and "<Prefix>:down". The page must use the
	// same one. It is "treactui" when empty.
	Prefix string
}

const defaultPrefix = "treactui"

func (o Options) upEvent() string   { return o.prefix() + ":up" }
func (o Options) downEvent() string { return o.prefix() + ":down" }

func (o Options) prefix() string {
	if o.Prefix == "" {
		return defaultPrefix
	}
	return o.Prefix
}
