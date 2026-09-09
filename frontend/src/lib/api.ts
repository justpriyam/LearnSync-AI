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

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://learnsync-ai-jmem.onrender.com"
    : "http://localhost:8000");
const API_TIMEOUT_MS = 30_000;

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      const detail = Array.isArray(error.detail)
        ? error.detail.map((item: { msg?: string }) => item.msg || "Invalid request").join(", ")
        : error.detail;
      throw new ApiError(detail || `API error: ${res.status}`, res.status);
    }
    return res.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(
        "The learning service is waking up or taking longer than expected. Please try again in a moment."
      );
    }
    if (error instanceof TypeError) {
      throw new ApiError(
        "We could not reach the learning service. Check your connection and try again."
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function uploadDocument(
  file: File,
  onProgress?: (progress: number) => void
): Promise<DocumentResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${API_BASE}/documents`);
    request.timeout = API_TIMEOUT_MS;
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      let response: { detail?: string } & Partial<DocumentResponse> = {};
      try {
        response = JSON.parse(request.responseText);
      } catch {
        reject(new ApiError("The server returned an invalid response.", request.status));
        return;
      }
      if (request.status >= 200 && request.status < 300) {
        resolve(response as DocumentResponse);
      } else {
        const detail = Array.isArray(response.detail)
          ? response.detail.map((item: { msg?: string }) => item.msg || "Invalid request").join(", ")
          : response.detail;
        reject(new ApiError(detail || `API error: ${request.status}`, request.status));
      }
    };
    request.onerror = () => reject(new ApiError("We could not reach the learning service. Check your connection and try again."));
    request.ontimeout = () => reject(new ApiError("The learning service is waking up or taking longer than expected. Please try again in a moment."));
    request.send(formData);
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
