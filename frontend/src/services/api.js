import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const api = axios.create({ baseURL });

export const generateFromWireframe = (formData) => api.post('/generate', formData);
export const generateFromPrompt = (prompt, pageName = 'Home') => api.post('/prompt-ui', { prompt, pageName });
export const updatePromptUI = (code, css, prompt) => api.post('/prompt-ui-update', { code, css, prompt });
export const modifyReactCode = (code, prompt) => api.post('/react-feature', { code, prompt });

// CMS & Section API Endpoints
export const fetchCMSElements = (pageName = 'Home', sectionId = '') => 
  api.get('/elements', { params: { pageName, sectionId } });
export const updateCMSElement = (fieldId, data) => api.patch(`/elements/${fieldId}`, data);

export const fetchSections = (pageName = '') => api.get('/sections', { params: { pageName } });
export const fetchSectionById = (sectionId) => api.get(`/sections/${sectionId}`);
export const fetchHealth = () => api.get('/health');
