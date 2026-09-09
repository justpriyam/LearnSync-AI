export interface DocumentResponse {
  id: string;
  filename: string;
  doc_type: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  error_message: string | null;
  chunk_count: number | null;
  created_at: string;
}

export interface DocumentStatusResponse {
  id: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  error_message: string | null;
  chunk_count: number | null;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  source_chunk_id: string; // grounding field — always present
}

export interface CheatSheetBullet {
  text: string;
  order_index: number;
}

export interface Module {
  id: string;
  title: string;
  summary: string;
  order_index: number;
  source_chunk_ids: string[];
  quiz_questions: QuizQuestion[];
  cheatsheet_bullets: CheatSheetBullet[];
  lesson_content?: string | null;
  youtube_links?: string | null;
}

export interface CourseResponse {
  id: string;
  document_id: string;
  title: string;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  error_message: string | null;
  created_at: string;
  modules: Module[];
}

export interface CourseStatusResponse {
  id: string;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  error_message: string | null;
}

export interface SprintGenerateRequest {
  syllabus_document_id: string;
  pyq_document_id: string;
  deadline: string; // ISO date string e.g. "2026-09-10"
}

export interface SprintTopic {
  id: string;
  module_id: string;
  topic_title: string;
  pyq_frequency: number;
  similarity_score: number;
  priority_rank: number;
  assigned_day: number;
  is_low_priority: boolean;
}

export interface SprintPlanResponse {
  id: string;
  syllabus_document_id: string;
  pyq_document_id: string;
  course_id: string;
  deadline: string;
  total_days: number;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  error_message: string | null;
  created_at: string;
  topics: SprintTopic[];
}

export interface SprintPlanStatusResponse {
  id: string;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  error_message: string | null;
}

export interface InterviewTurn {
  turn_number: number;
  question: string;
  answer: string;
  score: number;
  feedback: string;
  difficulty_level: string;
}

export interface InterviewStartResponse {
  session_id: string;
  opening_question: string;
  difficulty_level: string;
}

export interface InterviewTurnResponse {
  turn_number: number;
  evaluation: {
    score: number;
    feedback: string;
    strengths: string[];
    weaknesses: string[];
  };
  next_question: string | null;
  difficulty_level: string;
  is_session_complete: boolean;
}

export interface InterviewReportResponse {
  session_id: string;
  total_turns: number;
  average_score: number;
  difficulty_progression: string[];
  topic_coverage: { topic: string; score: number }[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  turns: InterviewTurn[];
}
