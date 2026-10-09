package bridge

import (
	"reflect"
	"testing"
)

func seqs(messages []message) []int {
	out := []int{}
	for _, m := range messages {
		out = append(out, m.Seq)
	}
	return out
}

func TestSequencerHandsOutMessagesInOrder(t *testing.T) {
	var s sequencer

	if ready, ok := s.push(message{Seq: 2}); !ok || len(ready) != 0 {
		t.Fatalf("2 arrives before 0 and 1, so it waits: got %v", seqs(ready))
	}
	if ready, _ := s.push(message{Seq: 0}); !reflect.DeepEqual(seqs(ready), []int{0}) {
		t.Errorf("0 is ready alone, got %v", seqs(ready))
	}
	if ready, _ := s.push(message{Seq: 1}); !reflect.DeepEqual(seqs(ready), []int{1, 2}) {
		t.Errorf("1 releases 2 with it, got %v", seqs(ready))
	}
	if ready, ok := s.push(message{Seq: 1}); !ok || len(ready) != 0 {
		t.Errorf("a repeat is ignored, got %v", seqs(ready))
	}
	if ready, _ := s.push(message{Seq: 3}); !reflect.DeepEqual(seqs(ready), []int{3}) {
		t.Errorf("the next one flows straight through, got %v", seqs(ready))
	}
}

func TestSequencerGivesUpWhenTooManyWait(t *testing.T) {
	var s sequencer
	for n := 1; n <= maxHeld; n++ {
		if _, ok := s.push(message{Seq: n}); !ok {
			t.Fatalf("%d waiting is still fine", n)
		}
	}
	if _, ok := s.push(message{Seq: maxHeld + 1}); ok {
		t.Error("one more than the limit should report failure")
	}
}
