  // Default to production API if no env var is provided
  let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://deployflow-api.onrender.com';
  
  // Handle local development if hostname is localhost
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:4000';
  }

  // Ensure it starts with https
  if (!apiUrl.startsWith('http')) {
    apiUrl = `https://${apiUrl}`;
  }

  return apiUrl;
};

export const getSocketUrl = () => {
  return getApiUrl();
};
