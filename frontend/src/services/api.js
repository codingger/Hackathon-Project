import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:3000/api' });

export const generateFromWireframe = (formData) => api.post('/generate', formData);
export const generateFromPrompt = (prompt) => api.post('/prompt-ui', { prompt });
export const updatePromptUI = (code, css, prompt) => api.post('/prompt-ui-update', { code, css, prompt });
export const modifyReactCode = (code, prompt) => api.post('/react-feature', { code, prompt });

// CMS API Endpoints
export const fetchCMSElements = (pageName = 'Home') => api.get('/elements', { params: { pageName } });
export const updateCMSElement = (fieldId, data) => api.patch(`/elements/${fieldId}`, data);
