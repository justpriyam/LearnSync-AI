import {
  DocumentResponse,
  DocumentStatusResponse,
  CourseResponse,
  CourseStatusResponse,
  SprintPlanStatusResponse,
  SprintPlanResponse,
  InterviewStartResponse,
  InterviewTurnResponse,
  InterviewReportResponse
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }
  return res.json();
}

export async function uploadDocument(
  file: File
): Promise<DocumentResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return fetchAPI<DocumentResponse>("/documents", {
    method: "POST",
    body: formData,
  });
}

export async function getDocumentStatus(
  id: string
): Promise<DocumentStatusResponse> {
  return fetchAPI<DocumentStatusResponse>(`/documents/${id}/status`);
}

export async function listDocuments(): Promise<DocumentResponse[]> {
  return fetchAPI<DocumentResponse[]>("/documents");
}

export async function generateCourse(
  documentId: string
): Promise<CourseStatusResponse> {
  return fetchAPI<CourseStatusResponse>(`/courses/${documentId}/generate`, {
    method: "POST",
  });
}

export async function getCourse(courseId: string): Promise<CourseResponse> {
  return fetchAPI<CourseResponse>(`/courses/${courseId}`);
}

export async function generateSprint(
  syllabusDocId: string,
  pyqDocId: string,
  deadline: string
): Promise<SprintPlanStatusResponse> {
  return fetchAPI<SprintPlanStatusResponse>('/sprint/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      syllabus_document_id: syllabusDocId,
      pyq_document_id: pyqDocId,
      deadline: deadline,
    }),
  });
}

export async function getSprint(sprintId: string): Promise<SprintPlanResponse> {
  return fetchAPI<SprintPlanResponse>(`/sprint/${sprintId}`);
}

export async function startInterview(
  resumeDocId: string,
  jdDocId: string
): Promise<InterviewStartResponse> {
  return fetchAPI<InterviewStartResponse>('/interview/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume_document_id: resumeDocId, jd_document_id: jdDocId }),
  });
}

export async function submitInterviewTurn(
  sessionId: string,
  answerText: string
): Promise<InterviewTurnResponse> {
  return fetchAPI<InterviewTurnResponse>(`/interview/${sessionId}/turn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer_text: answerText }),
  });
}

export async function getInterviewReport(
  sessionId: string
): Promise<InterviewReportResponse> {
  return fetchAPI<InterviewReportResponse>(`/interview/${sessionId}/report`);
}
