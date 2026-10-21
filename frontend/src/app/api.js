const BASE = 'http://localhost:3000/api';

function authHeaders() {
  const token = localStorage.getItem('token');
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { ...authHeaders(), ...options.headers },
    ...options,
  });
  if (res.status === 401 && url !== '/auth/login' && url !== '/auth/me') {
    // Token expired — redirect to login
    localStorage.removeItem('token');
    if (window.location.pathname.startsWith('/admin')) {
      window.location.href = '/admin/login';
    }
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Ошибка сервера' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Admin — candidates (protected)
  getCandidates: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/candidates${qs ? '?' + qs : ''}`);
  },
  getCandidate: (id) => request(`/candidates/${id}`),
  getStats: () => request('/candidates/stats'),
  getRanking: () => request('/candidates/ranking'),
  createCandidate: (data) => request('/candidates', { method: 'POST', body: JSON.stringify(data) }),
  updateCandidate: (id, data) => request(`/candidates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCandidate: (id) => request(`/candidates/${id}`, { method: 'DELETE' }),
  addReview: (id, data) => request(`/candidates/${id}/review`, { method: 'POST', body: JSON.stringify(data) }),
  rescoreCandidate: (id) => request(`/candidates/${id}/rescore`, { method: 'POST' }),
  batchScore: () => request('/candidates/batch-score', { method: 'POST' }),

  // AI (protected)
  getAiStatus: () => request('/ai/status'),
  analyzeCandidate: (id) => request(`/ai/analyze/${id}`, { method: 'POST' }),
  getAiAnalysis: (id) => request(`/ai/analysis/${id}`),
  startInterview: (id) => request(`/ai/interview/${id}/start`, { method: 'POST' }),
  sendInterviewMessage: (id, message) => request(`/ai/interview/${id}`, { method: 'POST', body: JSON.stringify({ message }) }),
  getInterviewHistory: (id) => request(`/ai/interview/${id}`),
  summarizeInterview: (id) => request(`/ai/interview/${id}/summarize`, { method: 'POST' }),
  getVideoInterview: (id) => request(`/ai/video-interview/${id}`),
  startVideoInterview: (id) => request(`/ai/video-interview/${id}/start`, { method: 'POST' }),
  completeVideoInterview: (id, data) => request(`/ai/video-interview/${id}/complete`, { method: 'POST', body: JSON.stringify(data) }),

  // Public — student
  submitApplication: (data) => request('/student/apply', { method: 'POST', body: JSON.stringify(data) }),
  checkStatus: (email) => request(`/student/status/${encodeURIComponent(email)}`),
  getStudentProfile: (id) => request(`/student/profile/${id}`),

  // Public — chat
  sendChatMessage: (message, sessionId) => request('/chat', { method: 'POST', body: JSON.stringify({ message, sessionId }) }),
  getChatHistory: (sessionId) => request(`/chat/${sessionId}`),
};
