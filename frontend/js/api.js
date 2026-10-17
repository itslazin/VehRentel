const API_BASE = window.APP_API_BASE || 'http://localhost:8080/api';

function csrfToken() {
  const cookie = document.cookie.split('; ').find(value => value.startsWith('XSRF-TOKEN='));
  return cookie ? decodeURIComponent(cookie.substring('XSRF-TOKEN='.length)) : '';
}

async function ensureCsrfToken() {
  if (csrfToken()) return csrfToken();
  await fetch(`${API_BASE}/auth/csrf`, { credentials: 'include' });
  return csrfToken();
}

async function apiRequest(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.method && options.method !== 'GET' && options.method !== 'HEAD' && options.method !== 'OPTIONS') {
    const token = await ensureCsrfToken();
    if (token) headers['X-XSRF-TOKEN'] = token;
  }
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const endpoint = `${API_BASE}${path}`;
  let response;
  try {
    response = await fetch(endpoint, { ...options, headers, credentials: 'include' });
  } catch (error) {
    const connectionError = new Error(`Unable to reach the backend API.\nEndpoint: ${endpoint}\nStart Spring Boot on port 8080.`);
    connectionError.endpoint = endpoint;
    connectionError.cause = error;
    throw connectionError;
  }
  const contentType = response.headers.get('content-type') || '';
  const bodyText = await response.text();
  let data = bodyText;
  if (bodyText && contentType.includes('application/json')) {
    try { data = JSON.parse(bodyText); } catch (_) { data = bodyText; }
  }
  if (!response.ok) {
    const backendMessage = typeof data === 'object' && data !== null
      ? (data.message || data.error || data.reason)
      : data;
    const error = new Error(`Request failed\nStatus: ${response.status}\nEndpoint: ${endpoint}\nMessage: ${backendMessage || 'No backend message'}\nResponse: ${bodyText || '(empty)'}`);
    error.status = response.status;
    error.data = data;
    error.endpoint = endpoint;
    throw error;
  }
  return data;
}

const apiGet = path => apiRequest(path);
const apiPost = (path, body) => apiRequest(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) });
const apiPut = (path, body) => apiRequest(path, {
  method: 'PUT',
  body: body instanceof FormData ? body : JSON.stringify(body)
});
const apiPatch = (path, body) => apiRequest(path, { method: 'PATCH', body: JSON.stringify(body) });
const apiDelete = path => apiRequest(path, { method: 'DELETE' });
