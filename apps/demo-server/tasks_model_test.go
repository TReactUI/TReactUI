package main

import (
	"testing"

	tea "charm.land/bubbletea/v2"

	ttygo "github.com/meta-tui/treactui/packages/tty-go"
)

func TestSpaceTogglesTheSelectedTaskAndAnnouncesIt(t *testing.T) {
	model, cmd := newTasksModel().Update(tea.KeyPressMsg{Code: tea.KeySpace, Text: " "})

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
	model, _ := newTasksModel().Update(tea.MouseClickMsg{Y: headerLines + 2, Button: tea.MouseLeft})

	options := model.(ttygo.Accessible).Accessible().Nodes[0].Children
	if !options[2].Selected || options[2].Label != "Toggle this one with space or a click, done" {
		t.Fatalf("unexpected options %+v", options)
	}
}
