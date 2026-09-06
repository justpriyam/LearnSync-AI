from datetime import date
import math

def score_topics(
    syllabus_modules: list[dict],
    pyq_chunks: list[dict],
    similarity_results: dict[str, list[dict]],
    deadline_date: date,
    today: date,
    similarity_threshold: float,
    low_priority_threshold: int,
) -> list[dict]:
    """
    Score and rank syllabus topics by PYQ frequency.
    
    For each module:
    1. Count how many PYQ chunks match above the similarity_threshold
    2. Average the similarity scores of matches
    3. Rank by frequency (descending), break ties by average similarity
    4. Assign to days (high-priority topics first, spread across available days)
    5. Mark topics below low_priority_threshold as is_low_priority=True
    
    Returns a list of scored topic dicts ready to be inserted as SprintTopic rows.
    """
    scored_modules = []
    
    total_days = max(1, (deadline_date - today).days)
    
    any_matches = False
    
    for mod in syllabus_modules:
        mod_id = mod["module_id"]
        title = mod["title"]
        
        matches = similarity_results.get(mod_id, [])
        valid_matches = [m for m in matches if m["similarity"] >= similarity_threshold]
        
        frequency = len(valid_matches)
        if frequency > 0:
            any_matches = True
            avg_sim = sum(m["similarity"] for m in valid_matches) / frequency
        else:
            avg_sim = 0.0
            
        is_low_priority = frequency <= low_priority_threshold
        
        scored_modules.append({
            "module_id": mod_id,
            "topic_title": title,
            "pyq_frequency": frequency,
            "similarity_score": avg_sim,
            "is_low_priority": is_low_priority,
            "total_days": total_days
        })
        
    if not any_matches and syllabus_modules:
        return []
        
    # Sort: frequency DESC, avg_sim DESC
    scored_modules.sort(key=lambda x: (x["pyq_frequency"], x["similarity_score"]), reverse=True)
    
    # Assign priority rank (1 is highest) and assign days
    num_modules = len(scored_modules)
    modules_per_day = math.ceil(num_modules / total_days) if total_days > 0 else num_modules
    
    for i, mod in enumerate(scored_modules):
        mod["priority_rank"] = i + 1
        # Assign day (1-indexed)
        if total_days == 1:
            mod["assigned_day"] = 1
        else:
            # simple round-robin or chunking
            mod["assigned_day"] = min((i // modules_per_day) + 1, total_days)
            
    return scored_modules
