import {
  DocumentResponse,
  DocumentStatusResponse,
  CourseResponse,
  CourseStatusResponse,
  SprintPlanStatusResponse,
  SprintPlanResponse,
  InterviewStartResponse,
  InterviewTurnResponse,
  InterviewReportResponse,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_TIMEOUT_MS = 90_000; // 90s for Render cold starts

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}


async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  // Get auth token
  let authHeaders: Record<string, string> = {};
  try {
    const tokenRes = await fetch('/api/auth/token');
    if (tokenRes.ok) {
      const tokenData = await tokenRes.json();
      if (tokenData.token) {
        authHeaders = { Authorization: `Bearer ${tokenData.token}` };
      }
    }
  } catch {
    // Not authenticated, continue without auth
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...authHeaders,
        ...options?.headers,
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new ApiError(error.detail || `API error: ${res.status}`, res.status);
    }
    return res.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(
        'The learning service is waking up or taking longer than expected. Please try again in a moment.'
      );
    }
    if (error instanceof TypeError) {
      throw new ApiError(
        'We could not reach the learning service. Check your connection and try again.'
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function syncUser(user: {
  id?: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}): Promise<void> {
  if (!user.id || !user.email) return;
  try {
    await fetchAPI('/auth/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        google_id: user.id,
        email: user.email,
        name: user.name || null,
        avatar_url: user.image || null,
      }),
    });
  } catch {
    console.warn('Failed to sync user with backend');
  }
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Dashboard
export interface DashboardSummary {
  documents_count: number;
  courses_count: number;
  sprints_count: number;
  interviews_count: number;
  recent_activity: {
    id: string;
    type: string;
    title: string;
    status: string;
    created_at: string;
  }[];
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return fetchAPI<DashboardSummary>('/dashboard/summary');
}

// Documents
export async function uploadDocument(
  file: File,
  onProgress?: (progress: number) => void
): Promise<DocumentResponse> {
  const formData = new FormData();
  formData.append('file', file);

  // Get auth token for XMLHttpRequest
  let authToken = '';
  try {
    const tokenRes = await fetch('/api/auth/token');
    if (tokenRes.ok) {
      const tokenData = await tokenRes.json();
      authToken = tokenData.token || '';
    }
  } catch {}

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `${API_BASE}/documents`);
    request.timeout = API_TIMEOUT_MS;
    if (authToken) {
      request.setRequestHeader('Authorization', `Bearer ${authToken}`);
    }
    request.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      let response: { detail?: string } & Partial<DocumentResponse> = {};
      try {
        response = JSON.parse(request.responseText);
      } catch {
        reject(new ApiError('The server returned an invalid response.', request.status));
        return;
      }
      if (request.status >= 200 && request.status < 300) {
        resolve(response as DocumentResponse);
      } else {
        reject(new ApiError(response.detail || `API error: ${request.status}`, request.status));
      }
    };
    request.onerror = () =>
      reject(new ApiError('We could not reach the learning service. Check your connection and try again.'));
    request.ontimeout = () =>
      reject(new ApiError('The learning service is waking up or taking longer than expected. Please try again in a moment.'));
    request.send(formData);
  });
}

export async function getDocumentStatus(id: string): Promise<DocumentStatusResponse> {
  return fetchAPI<DocumentStatusResponse>(`/documents/${id}/status`);
}

export async function listDocuments(): Promise<DocumentResponse[]> {
  return fetchAPI<DocumentResponse[]>('/documents');
}

// Courses
export async function listCourses(): Promise<CourseResponse[]> {
  return fetchAPI<CourseResponse[]>('/courses');
}

export async function generateCourse(documentId: string): Promise<CourseStatusResponse> {
  return fetchAPI<CourseStatusResponse>(`/courses/${documentId}/generate`, {
    method: 'POST',
  });
}

export async function getCourse(courseId: string): Promise<CourseResponse> {
  return fetchAPI<CourseResponse>(`/courses/${courseId}`);
}

// Sprint
export async function listSprints(): Promise<SprintPlanResponse[]> {
  return fetchAPI<SprintPlanResponse[]>('/sprint');
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

// Interview
export interface InterviewSessionSummary {
  id: string;
  status: string;
  current_difficulty: string;
  created_at: string;
  turn_count: number;
  average_score: number | null;
}

export interface InterviewTrends {
  sessions: { date: string; avg_score: number; turn_count: number }[];
  overall_average: number;
  total_sessions: number;
  improvement_trend: string;
}

export async function getInterviewHistory(): Promise<InterviewSessionSummary[]> {
  return fetchAPI<InterviewSessionSummary[]>('/interview/history');
}

export async function getInterviewTrends(): Promise<InterviewTrends> {
  return fetchAPI<InterviewTrends>('/interview/trends');
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
