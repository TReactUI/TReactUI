package protocol

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestSnapshotFrameEncodesNodesAsAnArray(t *testing.T) {
	encoded, err := EncodeServerFrame(NewSnapshotFrame(Snapshot{Title: "Downloads"}))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(encoded), `"nodes":[]`) {
		t.Fatalf("nodes must be an array, got %s", encoded)
	}
}

func TestAnnounceFrameDefaultsToPolite(t *testing.T) {
	encoded, _ := EncodeServerFrame(NewAnnounceFrame(AnnounceMsg{Text: "Done"}))
	var got map[string]any
	_ = json.Unmarshal(encoded, &got)
	if got["politeness"] != "polite" || got["text"] != "Done" {
		t.Fatalf("unexpected frame %v", got)
	}
}

func TestDecodeClientMessage(t *testing.T) {
	msg, err := DecodeClientMessage([]byte(`{"type":"resize","cols":80,"rows":24}`))
	if err != nil || msg.Cols != 80 || msg.Rows != 24 {
		t.Fatalf("got %v, %v", msg, err)
	}
	if _, err := DecodeClientMessage([]byte(`{"type":"zap"}`)); err == nil {
		t.Fatal("expected an error for an unknown type")
	}
	if _, err := DecodeClientMessage([]byte(`nope`)); err == nil {
		t.Fatal("expected an error for invalid JSON")
	}
}

func TestCommandsFrameEncodesAnEmptyCatalogAsAnArray(t *testing.T) {
	encoded, _ := EncodeServerFrame(NewCommandsFrame(nil))
	if !strings.Contains(string(encoded), `"commands":[]`) {
		t.Fatalf("commands must be an array, got %s", encoded)
	}
}

func TestCommandsFrameMatchesTheTypeScriptShape(t *testing.T) {
	encoded, _ := EncodeServerFrame(NewCommandsFrame([]CommandSpec{{
		Name:      "greet",
		Arguments: []ArgumentSpec{{Name: "name", Required: true}},
		Options:   []OptionSpec{{Flag: "--shout", Short: "-s"}},
	}}))
	want := `{"type":"commands","commands":[{"name":"greet","arguments":[{"name":"name","required":true,"variadic":false}],"options":[{"flag":"--shout","short":"-s","takesValue":false,"required":false}]}]}`
	if string(encoded) != want {
		t.Fatalf("got  %s\nwant %s", encoded, want)
	}
}

func TestDecodeRunAndStop(t *testing.T) {
	run, err := DecodeClientMessage([]byte(`{"type":"run","command":"greet","args":["Ada","--shout"]}`))
	if err != nil || run.Command != "greet" || len(run.Args) != 2 {
		t.Fatalf("got %v, %v", run, err)
	}
	if _, err := DecodeClientMessage([]byte(`{"type":"stop"}`)); err != nil {
		t.Fatalf("stop should decode: %v", err)
	}
}

func TestDecodeRejectsImplausibleSizesAndRunMessages(t *testing.T) {
	tooMany := `{"type":"run","command":"x","args":[` + strings.Repeat(`"a",`, 100) + `"a"]}`
	for name, frame := range map[string]string{
		"zero columns":      `{"type":"resize","cols":0,"rows":24}`,
		"huge terminal":     `{"type":"resize","cols":100000,"rows":24}`,
		"no command":        `{"type":"run","args":[]}`,
		"too many args":     tooMany,
		"a NUL in the args": `{"type":"run","command":"x","args":["a\u0000b"]}`,
		"a huge argument":   `{"type":"run","command":"x","args":["` + strings.Repeat("a", 10_001) + `"]}`,
	} {
		if _, err := DecodeClientMessage([]byte(frame)); err == nil {
			t.Errorf("%s: expected an error", name)
		}
	}
}
