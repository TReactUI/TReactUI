package protocol

import (
	"encoding/json"
	"os"
	"reflect"
	"slices"
	"testing"
)

// conformanceCase is one entry of packages/protocol/conformance/cases.json, the
// cases every implementation of the wire protocol is checked against.
type conformanceCase struct {
	Name      string          `json:"name"`
	Direction string          `json:"direction"`
	Valid     bool            `json:"valid"`
	Message   json.RawMessage `json:"message"`
	Raw       *string         `json:"raw"`
	Skip      []string        `json:"skip"`
}

func (c conformanceCase) frame() []byte {
	if c.Raw != nil {
		return []byte(*c.Raw)
	}
	return c.Message
}

func loadConformanceCases(t *testing.T) []conformanceCase {
	t.Helper()
	data, err := os.ReadFile("../../protocol/conformance/cases.json")
	if err != nil {
		t.Fatalf("cannot read the shared conformance cases: %v", err)
	}
	var file struct {
		Cases []conformanceCase `json:"cases"`
	}
	if err := json.Unmarshal(data, &file); err != nil {
		t.Fatal(err)
	}
	if len(file.Cases) == 0 {
		t.Fatal("no conformance cases found")
	}
	return file.Cases
}

// A client message is accepted exactly when the shared cases say it is.
func TestDecodeClientMessageAgreesWithTheConformanceCases(t *testing.T) {
	checked := 0
	for _, c := range loadConformanceCases(t) {
		if c.Direction != "client" {
			continue
		}
		checked++
		t.Run(c.Name, func(t *testing.T) {
			_, err := DecodeClientMessage(c.frame())
			if c.Valid && err != nil {
				t.Fatalf("should be accepted, got %v", err)
			}
			if !c.Valid && err == nil {
				t.Fatalf("should be rejected: %s", c.frame())
			}
		})
	}
	if checked == 0 {
		t.Fatal("no client cases were run")
	}
}

// Go only produces server messages, so the check is a round trip: a valid frame
// read into a ServerFrame and written back must mean the same thing, which catches
// a field the encoder drops or invents (an empty list lost to omitempty, say).
func TestServerFrameRoundTripsEveryValidConformanceCase(t *testing.T) {
	checked := 0
	for _, c := range loadConformanceCases(t) {
		if c.Direction != "server" || !c.Valid || slices.Contains(c.Skip, "go-roundtrip") {
			continue
		}
		checked++
		t.Run(c.Name, func(t *testing.T) {
			var frame ServerFrame
			if err := json.Unmarshal(c.frame(), &frame); err != nil {
				t.Fatalf("cannot read the frame: %v", err)
			}
			encoded, err := EncodeServerFrame(frame)
			if err != nil {
				t.Fatal(err)
			}
			var want, got any
			_ = json.Unmarshal(c.frame(), &want)
			_ = json.Unmarshal(encoded, &got)
			if !reflect.DeepEqual(want, got) {
				t.Fatalf("the frame changed on the way through:\n  in:  %s\n  out: %s", c.frame(), encoded)
			}
		})
	}
	if checked == 0 {
		t.Fatal("no server cases were run")
	}
}
