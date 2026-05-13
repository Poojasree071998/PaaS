export const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    // If we are on Vercel, we MUST point to the actual backend on Render
    return 'https://paas-k7nx.onrender.com';
  }

  // Handle local development
  return 'http://localhost:4000';
};

export const getSocketUrl = () => {
  // Use local API for development, Render for production
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:4000';
  }
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  return 'https://paas-k7nx.onrender.com';
};
