import { configureStore } from '@reduxjs/toolkit';
import cmsReducer from './cmsSlice';

export const store = configureStore({
  reducer: {
    cms: cmsReducer,
  },
});