export const getApiUrl = () => {
  // Use relative path for Netlify Proxy
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return window.location.origin;
  }

  // Handle local development
  return 'http://localhost:4000';
};

export const getSocketUrl = () => {
  return getApiUrl();
};
