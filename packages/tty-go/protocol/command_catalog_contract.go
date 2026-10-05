package protocol

// ArgumentSpec is a positional argument of a command.
type ArgumentSpec struct {
	Name         string   `json:"name"`
	Description  string   `json:"description,omitempty"`
	Required     bool     `json:"required"`
	Variadic     bool     `json:"variadic"`
	DefaultValue string   `json:"defaultValue,omitempty"`
	Choices      []string `json:"choices,omitempty"`
}

// OptionSpec is a flag of a command.
type OptionSpec struct {
	// Flag is the long form with its dashes (--shout), or the short form when there is no long one.
	Flag         string   `json:"flag"`
	Short        string   `json:"short,omitempty"`
	Description  string   `json:"description,omitempty"`
	TakesValue   bool     `json:"takesValue"`
	ValueName    string   `json:"valueName,omitempty"`
	DefaultValue string   `json:"defaultValue,omitempty"`
	Choices      []string `json:"choices,omitempty"`
	Required     bool     `json:"required"`
}

// CommandSpec is one runnable command, offered to the browser in a "commands" frame.
type CommandSpec struct {
	// Name is what the user types: "greet", or "remote add" for a nested command.
	Name        string         `json:"name"`
	Description string         `json:"description,omitempty"`
	Arguments   []ArgumentSpec `json:"arguments"`
	Options     []OptionSpec   `json:"options"`
}
