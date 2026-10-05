package main

import (
	"testing"

	tea "github.com/charmbracelet/bubbletea"

	ttygo "github.com/TReactUI/TReactUI/packages/tty-go"
)

func TestSpaceTogglesTheSelectedTaskAndAnnouncesIt(t *testing.T) {
	model, cmd := newTasksModel().Update(tea.KeyMsg{Type: tea.KeySpace})

	snapshot := model.(ttygo.Accessible).Accessible()
	option := snapshot.Nodes[0].Children[0]
	if option.Label != "Read the accessibility notes, done" || !option.Selected {
		t.Fatalf("unexpected option %+v", option)
	}
	if announce, ok := cmd().(ttygo.AnnounceMsg); !ok || announce.Text != "Read the accessibility notes: done" {
		t.Fatalf("unexpected announcement %+v", announce)
	}
}

func TestClickOnARowSelectsAndTogglesIt(t *testing.T) {
	model, _ := newTasksModel().Update(tea.MouseMsg{Y: headerLines + 2, Action: tea.MouseActionPress, Button: tea.MouseButtonLeft})

	options := model.(ttygo.Accessible).Accessible().Nodes[0].Children
	if !options[2].Selected || options[2].Label != "Toggle this one with space or a click, done" {
		t.Fatalf("unexpected options %+v", options)
	}
}
