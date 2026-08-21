import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { setSectionData, updateElementContent } from './redux/cmsSlice';
import './App.css';

export default function App() {
  const [wireframeFile, setWireframeFile] = useState(null);
  const [promptText, setPromptText] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [generatedInfo, setGeneratedInfo] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Raw elements list to know contentType, elementName, and structure dynamically
  const [elementsList, setElementsList] = useState([]);

  // Editor states for live PATCH API testing
  const [editFieldId, setEditFieldId] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editStatus, setEditStatus] = useState('');

  const dispatch = useDispatch();
  const data = useSelector((state) => state.cms?.allSections?.['Home'] || {});
  const cssData = useSelector((state) => state.cms?.allSectionsCss?.['Home'] || {});

  useEffect(() => {
    const targetUrl = generatedInfo?.sectionId 
      ? `http://localhost:3000/api/elements?sectionId=${generatedInfo.sectionId}`
      : 'http://localhost:3000/api/elements?pageName=Home';

    axios.get(targetUrl)
      .then((res) => {
        if (res.data.ok && res.data.data.length > 0) {
          setElementsList(res.data.data);
          dispatch(setSectionData({ pageName: 'Home', elements: res.data.data }));
          if (res.data.data[0]) {
            setEditFieldId(res.data.data[0].fieldId);
          }
        }
      })
      .catch((err) => console.error("Error fetching elements:", err));
  }, [dispatch, refreshKey, generatedInfo]);

  // Apply dynamic CSS overlays from Redux store after mount/update
  useEffect(() => {
    Object.entries(cssData).forEach(([id, cssString]) => {
      const el = document.getElementById(id);
      if (el && cssString) el.style.cssText = cssString;
    });
  }, [cssData, elementsList]);

  const handleFileChange = (e) => {
    setWireframeFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage('AI is analyzing your wireframe and building custom UI layout...');

    const formData = new FormData();
    if (wireframeFile) {
      formData.append('wireframe', wireframeFile);
    }
    formData.append('prompt', promptText);
    formData.append('pageName', 'Home');

    try {
      const response = await axios.post('http://localhost:3000/api/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.ok) {
        setStatusMessage('Success! Gemini AI generated custom dynamic UI layout.');
        setGeneratedInfo(response.data);
        setRefreshKey(prev => prev + 1);
      } else {
        setStatusMessage('Generation failed.');
      }
    } catch (err) {
      console.error(err);
      setStatusMessage('Error connecting to backend server.');
    }
  };

  const handleElementUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.patch(`http://localhost:3000/api/elements/${editFieldId}`, {
        content: editContent,
        pageName: 'Home'
      });
      if (res.data.ok) {
        dispatch(updateElementContent({ pageName: 'Home', fieldId: editFieldId, content: editContent }));
        setElementsList(prev => prev.map(el => el.fieldId === editFieldId ? { ...el, content: editContent } : el));
        setEditStatus('Element updated successfully via PATCH API & Redux!');
      }
    } catch (err) {
      console.error(err);
      setEditStatus('Failed to update element.');
    }
  };

  // Dynamic Component Renderer: Paints whatever components Gemini creates on the fly
  // Dynamic Component Renderer with type safety checks
  // Dynamic Component Renderer: Safely maps AI component types to clean UI elements
  // Bulletproof helper to extract clean text from strings, objects, or arrays
  const getSafeText = (val, fallback) => {
    if (val === undefined || val === null) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      return val.content || val.field1 || val.text || val.name || fallback;
    }
    return String(val);
  };

  // Dynamic Component Renderer: Safely maps AI component types to clean UI elements
  const renderDynamicElement = (el) => {
    const rawContent = data[el.fieldId] !== undefined ? data[el.fieldId] : el.content;
    const safeContent = getSafeText(rawContent, el.elementName || "AI Component");
    const type = (el.elementName || '').toLowerCase();

    if (type.includes('navbar') || type.includes('logo')) {
      return (
        <div key={el.fieldId} id={el.fieldId} style={{ background: '#1f2937', color: 'white', padding: '12px 20px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>{safeContent}</strong>
          <div style={{ fontSize: '12px', display: 'flex', gap: '15px', color: '#9ca3af' }}>
            <span>HOME</span><span>MENU</span><span>CONTACT</span>
          </div>
        </div>
      );
    }

    if (type.includes('search')) {
      return (
        <div key={el.fieldId} id={el.fieldId} style={{ background: '#f3f4f6', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
          <input type="text" placeholder={safeContent} readOnly style={{ width: '90%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '12px', textAlign: 'center', background: 'white' }} />
        </div>
      );
    }

    if (type.includes('heading') || type.includes('title')) {
      return (
        <h2 key={el.fieldId} id={el.fieldId} style={{ fontSize: '18px', fontWeight: '800', margin: '10px 0', color: '#111827', textAlign: 'center' }}>
          {safeContent}
        </h2>
      );
    }

    if (type.includes('button')) {
      return (
        <div key={el.fieldId} style={{ textAlign: 'center', margin: '15px 0' }}>
          <button id={el.fieldId} style={{ padding: '10px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            {safeContent}
          </button>
        </div>
      );
    }

    if (type.includes('cards') || el.contentType === 'Cards') {
      const loopItems = Array.isArray(rawContent) ? rawContent : (el.loop || []);
      return (
        <div key={el.fieldId} id={el.fieldId} style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(loopItems.length, 1)}, 1fr)`, gap: '10px', margin: '10px 0' }}>
          {loopItems.map((card, idx) => (
            <div key={card.fieldId1 || idx} style={{ background: '#f9fafb', padding: '12px', borderRadius: '6px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
              <div id={card.fieldId1} style={{ fontWeight: 'bold', fontSize: '14px', color: '#1f2937' }}>{getSafeText(card.field1, 'Item')}</div>
              <div id={card.fieldId2} style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{getSafeText(card.field2, '')}</div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <p key={el.fieldId} id={el.fieldId} style={{ fontSize: '13px', color: '#4b5563', margin: '8px 0', background: '#f9fafb', padding: '10px', borderRadius: '6px', borderLeft: '3px solid #2563eb', textAlign: 'center' }}>
        {safeContent}
      </p>
    );
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1100px', margin: 'auto', fontFamily: 'sans-serif', background: '#f4f6f8', minHeight: '100vh' }}>
      <h2>AI UI Generator Studio (PS7 - Dynamic AI Mode)</h2>
      
      {/* Upload Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <label>
          <strong>Upload Wireframe Sketch:</strong>
          <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'block', marginTop: '5px' }} />
        </label>

        <label>
          <strong>AI Instructions / Prompt:</strong>
          <textarea 
            value={promptText} 
            onChange={(e) => setPromptText(e.target.value)} 
            placeholder="e.g., E-commerce store layout with product cards, search bar, and checkout CTA..." 
            rows="2"
            style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
          />
        </label>

        <button type="submit" style={{ padding: '12px', background: '#2563eb', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '6px' }}>
          Generate Dynamic UI with Gemini AI
        </button>
      </form>

      {statusMessage && <p style={{ marginTop: '15px', fontWeight: 'bold', color: '#16a34a' }}>{statusMessage}</p>}

      {generatedInfo && (
        <div style={{ background: '#e0f2fe', padding: '15px', marginTop: '15px', borderRadius: '5px', border: '1px solid #bae6fd' }}>
          <h4>Generated Section Metadata:</h4>
          <p><strong>Section ID:</strong> {generatedInfo.sectionId}</p>
          <p><strong>Page Name:</strong> {generatedInfo.pageName}</p>
        </div>
      )}

      {/* Simulated CMS Content Editor Panel (PATCH API Test) */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginTop: '20px' }}>
        <h3 style={{ marginTop: 0, fontSize: '16px' }}>Simulated CMS Content Editor (PATCH API Test)</h3>
        <form onSubmit={handleElementUpdate} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            value={editFieldId} 
            onChange={(e) => setEditFieldId(e.target.value)}
            style={{ padding: '8px', flex: 1 }}
          >
            {elementsList.map((el) => (
              <option key={el.fieldId} value={el.fieldId}>
                {el.elementName} ({el.fieldId}) - [{el.contentType}]
              </option>
            ))}
          </select>

          <input 
            type="text" 
            placeholder="New content value..." 
            value={editContent} 
            onChange={(e) => setEditContent(e.target.value)}
            style={{ padding: '8px', flex: 2 }}
          />

          <button type="submit" style={{ padding: '8px 15px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            Save & Update Preview
          </button>
        </form>
        {editStatus && <p style={{ fontSize: '12px', color: '#16a34a', marginTop: '5px' }}>{editStatus}</p>}
      </div>

      {/* SIDE-BY-SIDE VIEW: Uploaded Wireframe vs Fully Dynamic AI Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '30px' }}>
        
        {/* Left Box: Uploaded Wireframe Preview */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>Input Wireframe</h3>
          {wireframeFile ? (
            <img 
              src={URL.createObjectURL(wireframeFile)} 
              alt="Uploaded Wireframe" 
              style={{ width: '100%', height: 'auto', maxHeight: '400px', objectFit: 'contain', marginTop: '10px' }} 
            />
          ) : (
            <p style={{ color: '#6b7280', fontStyle: 'italic' }}>Upload a wireframe image above to preview it here.</p>
          )}
        </div>

        {/* Right Box: Dynamically Rendered AI Website Preview */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>AI-Generated Dynamic UI Preview</h3>
          
          <div style={{ border: '1px solid #d1d5db', borderRadius: '6px', background: '#ffffff', padding: '15px', minHeight: '400px', marginTop: '10px' }}>
            {elementsList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {elementsList.map((el) => renderDynamicElement(el))}
              </div>
            ) : (
              <p style={{ color: '#6b7280', fontStyle: 'italic', textAlign: 'center', marginTop: '100px' }}>
                Upload a wireframe sketch and click generate. Gemini AI will create the UI elements dynamically on the fly!
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}