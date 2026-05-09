export const getApiUrl = () => {
  // Use relative path for Netlify Proxy to bypass CORS and Render build limits
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return window.location.origin + '/api';
  }

  // Handle local development
  return 'http://localhost:4000';
};

export const getSocketUrl = () => {
  return getApiUrl();
};
