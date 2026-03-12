const BASE_URL = 'https://ai-hotel-manager-production.up.railway.app';

export const apiCall = async (endpoint, method = 'GET', body = null) => {
  const token = localStorage.getItem('bizagent_token');
  
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const config = {
      method,
      headers,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        if (data.error && data.error.includes("deactivated")) {
           // Handle specific deactivated state in the component or via a custom error
           throw { status: response.status, message: data.error, type: 'DEACTIVATED' };
        }
        localStorage.removeItem('bizagent_token');
        window.location.href = '/login';
      }
      throw new Error(data.error || 'Something went wrong');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};
