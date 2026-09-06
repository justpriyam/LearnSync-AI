import pytest
from datetime import date, timedelta
from app.services.sprint_scorer import score_topics

def test_topics_ranked_by_frequency():
    """Topics with more PYQ matches should rank higher."""
    syllabus_modules = [
        {"module_id": "A", "title": "Topic A"},
        {"module_id": "B", "title": "Topic B"},
        {"module_id": "C", "title": "Topic C"}
    ]
    similarity_results = {
        "A": [{"similarity": 0.9} for _ in range(5)],
        "B": [{"similarity": 0.8} for _ in range(2)],
        "C": []
    }
    
    scored = score_topics(
        syllabus_modules, [], similarity_results,
        date.today() + timedelta(days=5), date.today(),
        0.5, 1
    )
    
    assert scored[0]["module_id"] == "A"
    assert scored[0]["priority_rank"] == 1
    assert scored[1]["module_id"] == "B"
    assert scored[1]["priority_rank"] == 2
    assert scored[2]["module_id"] == "C"
    assert scored[2]["priority_rank"] == 3
    assert scored[2]["is_low_priority"] == True
    assert scored[1]["is_low_priority"] == False

def test_tie_breaking_by_similarity():
    """When two topics have equal frequency, higher avg similarity wins."""
    syllabus_modules = [
        {"module_id": "A", "title": "Topic A"},
        {"module_id": "B", "title": "Topic B"}
    ]
    similarity_results = {
        "A": [{"similarity": 0.8} for _ in range(3)],
        "B": [{"similarity": 0.6} for _ in range(3)]
    }
    
    scored = score_topics(
        syllabus_modules, [], similarity_results,
        date.today() + timedelta(days=5), date.today(),
        0.5, 1
    )
    
    assert scored[0]["module_id"] == "A"
    assert scored[1]["module_id"] == "B"

def test_low_priority_threshold():
    """Topics with frequency <= threshold are marked low priority."""
    syllabus_modules = [
        {"module_id": "A", "title": "Topic A"}
    ]
    similarity_results = {
        "A": [{"similarity": 0.8}]
    }
    
    scored = score_topics(
        syllabus_modules, [], similarity_results,
        date.today() + timedelta(days=5), date.today(),
        0.5, 1
    )
    
    assert scored[0]["is_low_priority"] == True

def test_day_assignment():
    """High priority topics get earlier days."""
    syllabus_modules = [{"module_id": str(i), "title": f"Topic {i}"} for i in range(6)]
    similarity_results = {str(i): [{"similarity": 0.9}] for i in range(6)}
    
    scored = score_topics(
        syllabus_modules, [], similarity_results,
        date.today() + timedelta(days=3), date.today(),
        0.5, 1
    )
    
    # 6 modules, 3 days -> 2 per day
    assert scored[0]["assigned_day"] == 1
    assert scored[1]["assigned_day"] == 1
    assert scored[2]["assigned_day"] == 2
    assert scored[3]["assigned_day"] == 2
    assert scored[4]["assigned_day"] == 3
    assert scored[5]["assigned_day"] == 3

def test_no_matches_returns_empty():
    """If no PYQ chunks match any module above threshold, return empty list."""
    syllabus_modules = [{"module_id": "A", "title": "Topic A"}]
    similarity_results = {"A": [{"similarity": 0.1}]}
    
    scored = score_topics(
        syllabus_modules, [], similarity_results,
        date.today() + timedelta(days=5), date.today(),
        0.5, 1
    )
    
    assert len(scored) == 0

def test_minimum_one_day():
    """Even if deadline is today, plan should have at least 1 day."""
    syllabus_modules = [{"module_id": "A", "title": "Topic A"}]
    similarity_results = {"A": [{"similarity": 0.9}]}
    
    scored = score_topics(
        syllabus_modules, [], similarity_results,
        date.today(), date.today(),
        0.5, 1
    )
    
    assert scored[0]["total_days"] == 1
    assert scored[0]["assigned_day"] == 1
