package bridge

// maxHeld bounds how many messages wait for an earlier one; a host that loses events
// would otherwise make them pile up for ever.
const maxHeld = 4096

// sequencer puts the messages of one connection back in order: it hands them out in the
// order of their numbers, holding back any that arrives before an earlier one.
type sequencer struct {
	next int
	held map[int]message
}

// push takes a message and returns the ones now ready, in order. It returns false when
// too many are waiting, which means the connection cannot be followed any more.
func (s *sequencer) push(m message) (ready []message, ok bool) {
	if m.Seq < s.next {
		return nil, true // a repeat of one already handed out
	}
	if s.held == nil {
		s.held = map[int]message{}
	}
	s.held[m.Seq] = m
	if len(s.held) > maxHeld {
		return nil, false
	}
	for {
		next, there := s.held[s.next]
		if !there {
			return ready, true
		}
		delete(s.held, s.next)
		s.next++
		ready = append(ready, next)
	}
}
