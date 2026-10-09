package main

import (
	"fmt"

	tea "charm.land/bubbletea/v2"
	"charm.land/lipgloss/v2"

	ttygo "github.com/meta-tui/treactui/packages/tty-go"
)

type task struct {
	title string
	done  bool
}

// tasksModel is a small to-do list: the demo's TUI. It draws with Lipgloss,
// takes keys and mouse clicks, and describes itself for screen readers.
type tasksModel struct {
	tasks  []task
	cursor int
}

func newTasksModel() tea.Model {
	return tasksModel{tasks: []task{
		{title: "Read the accessibility notes"},
		{title: "Press Ctrl+Shift+M to leave the terminal"},
		{title: "Toggle this one with space or a click"},
	}}
}

const headerLines = 2

var (
	titleStyle    = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#7dd3fc"))
	selectedStyle = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#0f172a")).Background(lipgloss.Color("#7dd3fc"))
	doneStyle     = lipgloss.NewStyle().Foreground(lipgloss.Color("#7c8ba1")).Strikethrough(true)
	helpStyle     = lipgloss.NewStyle().Foreground(lipgloss.Color("#94a3b8"))
)

func (m tasksModel) Init() tea.Cmd { return nil }

func (m tasksModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyPressMsg:
		switch msg.String() {
		case "up", "k":
			m.cursor = max(0, m.cursor-1)
		case "down", "j":
			m.cursor = min(len(m.tasks)-1, m.cursor+1)
		case "space", "enter":
			return m.toggle(m.cursor)
		case "ctrl+c", "q":
			return m, tea.Quit
		}
	case tea.MouseClickMsg:
		row := msg.Y - headerLines
		if msg.Button == tea.MouseLeft && row >= 0 && row < len(m.tasks) {
			m.cursor = row
			return m.toggle(row)
		}
	}
	return m, nil
}

func (m tasksModel) toggle(index int) (tea.Model, tea.Cmd) {
	m.tasks = append([]task(nil), m.tasks...)
	m.tasks[index].done = !m.tasks[index].done
	state := "open"
	if m.tasks[index].done {
		state = "done"
	}
	text := fmt.Sprintf("%s: %s", m.tasks[index].title, state)
	return m, func() tea.Msg { return ttygo.AnnounceMsg{Text: text} }
}

func (m tasksModel) View() tea.View {
	out := titleStyle.Render("Tasks") + "\n\n"
	for i, t := range m.tasks {
		box := "[ ]"
		if t.done {
			box = "[x]"
		}
		line := box + " " + t.title
		switch {
		case i == m.cursor:
			line = selectedStyle.Render(line)
		case t.done:
			line = doneStyle.Render(line)
		}
		out += line + "\n"
	}
	view := tea.NewView(out + "\n" + helpStyle.Render("↑/↓ move · space or click toggles · q quits"))
	view.MouseMode = tea.MouseModeCellMotion
	return view
}

// Accessible describes the list as a listbox, so a screen reader announces
// the selected option instead of scraping the redrawn screen.
func (m tasksModel) Accessible() ttygo.Snapshot {
	options := make([]ttygo.A11yNode, len(m.tasks))
	for i, t := range m.tasks {
		label := t.title + ", open"
		if t.done {
			label = t.title + ", done"
		}
		options[i] = ttygo.A11yNode{Role: "option", Label: label, Selected: i == m.cursor, Focused: i == m.cursor}
	}
	return ttygo.Snapshot{Title: "Tasks", Nodes: []ttygo.A11yNode{{Role: "listbox", Label: "Tasks", Children: options}}}
}
