const API_BASE = window.APP_API_BASE || '/api';

const RETRY_STATUSES = [502, 503, 504];
const MAX_RETRIES = 12;        // 12 x 5s = about 60 seconds of patience
const RETRY_DELAY_MS = 5000;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function setWakingBanner(show) {
  let banner = document.getElementById('server-waking-banner');
  if (!show) {
    if (banner) banner.remove();
    return;
  }
  if (banner) return;
  banner = document.createElement('div');
  banner.id = 'server-waking-banner';
  banner.textContent = 'Server is waking up, please wait a few seconds…';
  banner.style.cssText =
    'position:fixed;top:0;left:0;right:0;z-index:99999;padding:10px 16px;' +
    'background:#fff3cd;color:#664d03;text-align:center;font:14px sans-serif;' +
    'border-bottom:1px solid #ffecb5;';
  document.body.appendChild(banner);
}

async function fetchWithRetry(endpoint, init) {
  const method = (init.method || 'GET').toUpperCase();
  const canRetry = method === 'GET' || method === 'HEAD';
  const maxRetries = canRetry ? MAX_RETRIES : 0;
  try {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(endpoint, init);
        if (!RETRY_STATUSES.includes(response.status) || attempt === maxRetries) return response;
        setWakingBanner(true);
      } catch (error) {
        if (attempt === maxRetries) throw error;
        setWakingBanner(true);
      }
      await sleep(RETRY_DELAY_MS);
    }
  } finally {
    setWakingBanner(false);
  }
}

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
    response = await fetchWithRetry(endpoint, { ...options, headers, credentials: 'include' });
  } catch (error) {
    const connectionError = new Error('Unable to reach the server right now. Please try again in a minute.');
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
    if (RETRY_STATUSES.includes(response.status)) {
      const error = new Error('The server is temporarily unavailable. Please try again in a minute.');
      error.status = response.status;
      error.endpoint = endpoint;
      throw error;
    }
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