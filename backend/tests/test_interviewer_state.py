from app.services.interviewer import decide_next_difficulty

def test_escalation_on_high_score():
    # Score=5, current=intermediate -> should escalate to advanced
    assert decide_next_difficulty('intermediate', 4, 4, 2) == 'advanced'
    assert decide_next_difficulty('intermediate', 5, 4, 2) == 'advanced'

def test_pivot_on_low_score():
    # Score=1, current=advanced -> should pivot to intermediate
    assert decide_next_difficulty('advanced', 1, 4, 2) == 'intermediate'
    assert decide_next_difficulty('advanced', 2, 4, 2) == 'intermediate'

def test_stay_on_medium_score():
    # Score=3, current=intermediate -> should stay intermediate
    assert decide_next_difficulty('intermediate', 3, 4, 2) == 'intermediate'

def test_escalation_sequence():
    # Sequence of high scores: foundational -> intermediate -> advanced -> stays advanced
    diff = decide_next_difficulty('foundational', 5, 4, 2)
    assert diff == 'intermediate'
    diff = decide_next_difficulty(diff, 4, 4, 2)
    assert diff == 'advanced'
    diff = decide_next_difficulty(diff, 5, 4, 2)
    assert diff == 'advanced'

def test_pivot_sequence():
    # Sequence of low scores: advanced -> intermediate -> foundational -> stays foundational
    diff = decide_next_difficulty('advanced', 1, 4, 2)
    assert diff == 'intermediate'
    diff = decide_next_difficulty(diff, 2, 4, 2)
    assert diff == 'foundational'
    diff = decide_next_difficulty(diff, 1, 4, 2)
    assert diff == 'foundational'

def test_mixed_sequence():
    # Alternating scores: verify difficulty bounces correctly
    diff = decide_next_difficulty('intermediate', 5, 4, 2)
    assert diff == 'advanced'
    diff = decide_next_difficulty(diff, 2, 4, 2)
    assert diff == 'intermediate'
    diff = decide_next_difficulty(diff, 1, 4, 2)
    assert diff == 'foundational'
    diff = decide_next_difficulty(diff, 3, 4, 2)
    assert diff == 'foundational'
    diff = decide_next_difficulty(diff, 5, 4, 2)
    assert diff == 'intermediate'
