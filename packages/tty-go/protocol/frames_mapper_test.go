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
