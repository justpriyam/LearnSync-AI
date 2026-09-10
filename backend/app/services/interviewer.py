import json
from app.services.generator import call_groq
from app.config import settings

def decide_next_difficulty(current_difficulty: str, score: int, escalation_threshold: int, pivot_threshold: int) -> str:
    """
    Given current difficulty and answer score (1-5), decide next difficulty.
    Rules:
    - score >= escalation_threshold: go harder (foundational->intermediate->advanced)
    - score <= pivot_threshold: go easier (advanced->intermediate->foundational)
    - otherwise: stay at current level
    """
    difficulties = ['foundational', 'intermediate', 'advanced']
    idx = difficulties.index(current_difficulty)
    
    if score >= escalation_threshold:
        idx = min(len(difficulties) - 1, idx + 1)
    elif score <= pivot_threshold:
        idx = max(0, idx - 1)
        
    return difficulties[idx]

def generate_opening_question(resume_chunks: list[dict], jd_chunks: list[dict]) -> str:
    """Use Groq to generate a contextually relevant opening question from resume + JD."""
    resume_texts = [c.get("text", "") for c in resume_chunks]
    jd_texts = [c.get("text", "") for c in jd_chunks]
    
    prompt = f"""
    You are an expert technical interviewer. Based on the candidate's resume and the job description provided below, 
    generate ONE highly relevant opening interview question. The question should be designed to evaluate the candidate's fit 
    for the role based on their past experience. 

    Resume Context:
    {json.dumps(resume_texts)}
    
    Job Description Context:
    {json.dumps(jd_texts)}
    
    Return ONLY the question string, without any prefixes, quotes, or additional text.
    """
    
    try:
        response = call_groq(prompt, model=settings.INTERVIEW_GROQ_MODEL, max_tokens=256)
        question = response.strip(' "')
        if question:
            return question
    except Exception:
        pass

    return "Walk me through the experience from your resume that is most relevant to this role."

def evaluate_answer(question: str, answer: str, resume_context: str, jd_context: str, difficulty: str) -> dict:
    """Use Groq to evaluate answer quality. Returns {score, feedback, strengths, weaknesses}."""
    prompt = f"""
    You are an expert technical interviewer. Evaluate the candidate's answer to the following question.
    
    Question: {question}
    Answer: {answer}
    Expected Difficulty Level: {difficulty}
    
    Resume Context: {resume_context}
    Job Description Context: {jd_context}
    
    Respond strictly in JSON format with the following keys:
    - "score": an integer from 1 to 5 (1 being very poor, 5 being excellent)
    - "feedback": a string containing constructive feedback
    - "strengths": a list of strings highlighting the strong points of the answer
    - "weaknesses": a list of strings highlighting areas for improvement
    
    Ensure the JSON is valid and contains no other text.
    """
    
    try:
        response = call_groq(prompt, model=settings.INTERVIEW_GROQ_MODEL, json_mode=True, max_tokens=1024)
        data = json.loads(response)
        score = max(1, min(5, int(data.get("score", 3))))
        return {
            "score": score,
            "feedback": data.get("feedback", "No feedback provided."),
            "strengths": data.get("strengths", []),
            "weaknesses": data.get("weaknesses", [])
        }
    except Exception:
        return {
            "score": 1 if len(answer.strip()) < 40 else 3,
            "feedback": "Your answer was recorded. Add a specific example, explain your actions, and describe the result to make it stronger.",
            "strengths": ["You attempted the question."] if answer.strip() else [],
            "weaknesses": ["Use more specific evidence from your experience."]
        }

def generate_next_question(resume_chunks: list[dict], jd_chunks: list[dict], 
                           previous_turns: list[dict], difficulty: str) -> str:
    """Generate the next interview question based on context and desired difficulty."""
    resume_texts = [c.get("text", "") for c in resume_chunks]
    jd_texts = [c.get("text", "") for c in jd_chunks]
    
    history = "\n".join([f"Q: {t['question']}\nA: {t['answer']}\nScore: {t['score']}" for t in previous_turns])
    
    prompt = f"""
    You are an expert technical interviewer conducting an ongoing interview. 
    Based on the resume, job description, and previous Q&A history, generate the NEXT interview question.
    
    Target Difficulty Level: {difficulty}
    
    Rules for Difficulty:
    - foundational: basic concepts, definitions, direct experience
    - intermediate: situational questions, basic system design, problem-solving
    - advanced: complex architectural decisions, edge cases, scaling, leadership scenarios
    
    Previous Interview History:
    {history}
    
    Resume Context:
    {json.dumps(resume_texts)}
    
    Job Description Context:
    {json.dumps(jd_texts)}
    
    Return ONLY the question string, without any prefixes, quotes, or additional text.
    """
    
    try:
        response = call_groq(prompt, model=settings.INTERVIEW_GROQ_MODEL, max_tokens=256)
        question = response.strip(' "')
        if question:
            return question
    except Exception:
        pass

    fallback_questions = [
        "What was the most challenging part of that project, and how did you solve it?",
        "How did you measure whether your solution was successful?",
        "What would you improve if you had another month to work on it?",
    ]
    return fallback_questions[len(previous_turns) % len(fallback_questions)]

def generate_report(turns: list[dict], resume_context: str, jd_context: str) -> dict:
    """Aggregate turn data into a final analytics report."""
    if not turns:
        return {}
        
    avg_score = sum(t['score'] for t in turns) / len(turns)
    
    history = "\n".join([f"Q: {t['question']}\nA: {t['answer']}\nScore: {t['score']}" for t in turns])
    
    prompt = f"""
    You are an expert technical interviewer generating a final evaluation report for a candidate.
    
    Interview History:
    {history}
    
    Resume Context: {resume_context}
    Job Description Context: {jd_context}
    
    Based on the interview history, generate a summary report in valid JSON format with these keys:
    - "topic_coverage": list of objects with "topic" (string) and "score" (number out of 5)
    - "strengths": list of overall strong points across the interview (strings)
    - "weaknesses": list of overall areas for improvement (strings)
    - "suggestions": list of actionable advice for the candidate to improve (strings)
    
    Return ONLY valid JSON.
    """
    
    try:
        response = call_groq(prompt, model=settings.INTERVIEW_GROQ_MODEL, json_mode=True, max_tokens=2048)
        report_data = json.loads(response)
    except Exception:
        report_data = {
            "topic_coverage": [],
            "strengths": [],
            "weaknesses": [],
            "suggestions": ["Use the STAR structure: situation, task, action, and result."]
        }
        
    return {
        "average_score": avg_score,
        "difficulty_progression": [t['difficulty_level'] for t in turns],
        "topic_coverage": report_data.get("topic_coverage", []),
        "strengths": report_data.get("strengths", []),
        "weaknesses": report_data.get("weaknesses", []),
        "suggestions": report_data.get("suggestions", []),
    }
