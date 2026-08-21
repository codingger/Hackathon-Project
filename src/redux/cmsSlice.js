import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  allSections: {},     // Stores text/content elements mapped by pageName and fieldId
  allSectionsCss: {},  // Stores inline CSS overlays per element fieldId
};

const cmsSlice = createSlice({
  name: 'cms',
  initialState,
  reducers: {
    setSectionData: (state, action) => {
      const { pageName, elements } = action.payload;
      if (!state.allSections[pageName]) {
        state.allSections[pageName] = {};
      }
      if (!state.allSectionsCss[pageName]) {
        state.allSectionsCss[pageName] = {};
      }
      elements.forEach((el) => {
        state.allSections[pageName][el.fieldId] = el.content;
        if (el.css) {
          state.allSectionsCss[pageName][el.fieldId] = el.css;
        }
        // Handle nested loop card items if present
        if (el.loop && Array.isArray(el.loop)) {
          state.allSections[pageName][el.fieldId] = el.loop;
          el.loop.forEach((item) => {
            if (item.fieldId1) state.allSections[pageName][item.fieldId1] = item.field1;
            if (item.fieldId2) state.allSections[pageName][item.fieldId2] = item.field2;
          });
        }
      });
    },
    updateElementContent: (state, action) => {
      const { pageName, fieldId, content } = action.payload;
      if (state.allSections[pageName]) {
        state.allSections[pageName][fieldId] = content;
      }
    },
  },
});

export const { setSectionData, updateElementContent } = cmsSlice.actions;
export default cmsSlice.reducer;