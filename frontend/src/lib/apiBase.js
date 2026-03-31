const DEFAULT_LOCAL_API_URL = 'http://localhost:5000';
const DEFAULT_PRODUCTION_API_URL = 'https://amazon-recsys-backend.onrender.com';

const normalizeBaseUrl = (value) => value.replace(/\/+$/, '');

const resolveApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return normalizeBaseUrl(process.env.REACT_APP_API_URL);
  }

  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return DEFAULT_LOCAL_API_URL;
  }

  return DEFAULT_PRODUCTION_API_URL;
};

const API_URL = resolveApiUrl();

export default API_URL;
