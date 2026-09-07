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

// Normalize API_BASE by removing any accidental trailing slashes
const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

const DEFAULT_TIMEOUT_MS = 90000; // 90s timeout to allow Render free tier cold-start waking

interface FetchOptions extends RequestInit {
  timeoutMs?: number;
}

async function fetchAPI<T>(path: string, options?: FetchOptions): Promise<T> {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE}${cleanPath}`;
  
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: options?.signal || controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      const errorMessage = error.detail || `API error (${res.status}): ${res.statusText}`;
      throw new Error(errorMessage);
    }
    return await res.json();
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        throw new Error(
          "Request timed out. The cloud server may be waking up from cold start — please try again in a moment."
        );
      }
      if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        throw new Error(
          "Unable to connect to the backend server. If using the free tier, the server may take ~60 seconds to wake up."
        );
      }
      throw err;
    }
    throw new Error("An unexpected network error occurred.");
  }
}

/**
 * Ping backend health endpoint to warm up cold-starting server.
 */
export async function checkHealth(): Promise<{ status: string; service: string }> {
  return fetchAPI<{ status: string; service: string }>("/health", { timeoutMs: 15000 });
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
