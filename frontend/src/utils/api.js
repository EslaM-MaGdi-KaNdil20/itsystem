// API Helper with authentication
// Use the same hostname as the browser so it works from any device on the network
const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;

// Get the auth token from localStorage
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Handle auth errors — redirect to login on expired/invalid token
const handleAuthError = async (response) => {
  if (response.status === 401 || response.status === 403) {
    const data = await response.json().catch(() => ({}));
    if (data.code === 'TOKEN_EXPIRED' || data.code === 'NO_TOKEN' || data.code === 'INVALID_TOKEN') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error(data.error || 'انتهت صلاحية الجلسة - يرجى تسجيل الدخول مرة أخرى');
    }
  }
  return response;
};

// GET request
export const apiGet = async (endpoint) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  
  await handleAuthError(response);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'حدث خطأ' }));
    throw new Error(error.error || 'حدث خطأ');
  }
  
  return response.json();
};

// POST request
export const apiPost = async (endpoint, data) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  
  await handleAuthError(response);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'حدث خطأ' }));
    throw new Error(error.error || 'حدث خطأ');
  }
  
  return response.json();
};

// PUT request
export const apiPut = async (endpoint, data) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  
  await handleAuthError(response);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'حدث خطأ' }));
    throw new Error(error.error || 'حدث خطأ');
  }
  
  return response.json();
};

// DELETE request
export const apiDelete = async (endpoint) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  
  await handleAuthError(response);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'حدث خطأ' }));
    throw new Error(error.error || 'حدث خطأ');
  }
  
  return response.json();
};

// For file uploads (FormData)
export const apiUpload = async (endpoint, formData) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    body: formData
  });
  
  await handleAuthError(response);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'حدث خطأ' }));
    throw new Error(error.error || 'حدث خطأ');
  }
  
  return response.json();
};

// For blob responses (PDF, Excel)
export const apiBlob = async (endpoint) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  });
  
  await handleAuthError(response);
  
  if (!response.ok) {
    throw new Error('حدث خطأ في تحميل الملف');
  }
  
  return response.blob();
};

export { API_URL, getAuthHeaders, handleAuthError };
