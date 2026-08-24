import express from "express";
import bodyparser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import mongoose from "mongoose";
import axios from "axios";
import fs from 'fs';
import Section from "./models/Section.js";
import Elements from "./models/Elements.js";
import { generateId } from "./idGenerator.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());
app.use(cors());
app.use('/storage', express.static('uploads'));

const upload = multer({ dest: 'uploads/' });

mongoose.set('bufferCommands', false);
mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 })
  .then(() => console.log("Connected to MongoDB successfully."))
  .catch((err) => console.warn("MongoDB connection warning:", err.message));

// Helper function to call Gemini API with model fallback & rate limit retry
async function callGeminiAPI(payload) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY is missing in backend/.env file.");
  }

  const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];

  for (const model of models) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
        payload,
        { timeout: 20000 }
      );

      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (err) {
      if (err.response?.status === 429) {
        console.warn(`[Gemini API] Model ${model} rate limited (429). Trying fallback model...`);
        continue;
      }
      console.warn(`[Gemini API] Model ${model} error: ${err.message}`);
    }
  }

  throw new Error("Gemini API rate limit reached (429). Please wait 10-15 seconds and try again.");
}

// Helper to persist generated section & elements to MongoDB with retry-on-duplicate
async function persistGeneratedSection({ pageName = 'Home', sectionName = 'Custom', result, wireframePath }) {
  if (mongoose.connection.readyState !== 1) {
    console.warn("MongoDB disconnected. Skipping database persistence.");
    return { sectionId: generateId('1'), elementIds: [] };
  }

  let sectionId = generateId('1');
  let section = null;

  try {
    section = await Section.create({
      sectionId,
      sectionName,
      pageName,
      isGenerated: true,
      variations: "1",
    });
  } catch (err) {
    if (err.code === 11000) {
      sectionId = generateId('1');
      section = await Section.create({
        sectionId,
        sectionName,
        pageName,
        isGenerated: true,
        variations: "1",
      });
    } else {
      throw err;
    }
  }

  const elementIds = [];
  const rawElements = Array.isArray(result?.elements) ? result.elements : [];

  for (const el of rawElements) {
    const fieldId = el.fieldId || generateId('2');
    try {
      await Elements.create({
        sectionId,
        elementName: el.elementName || 'CMS Field',
        fieldId,
        content: el.content || '',
        contentType: el.contentType || 'Text',
        pageName,
        css: el.css || null
      });
      elementIds.push(fieldId);
    } catch (err) {
      console.warn(`Error persisting element fieldId ${fieldId}:`, err.message);
    }
  }

  return { sectionId, elementIds };
}

// --- HEALTH CHECK ROUTE ---
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// --- SECTIONS API ROUTES ---
app.get('/api/sections', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ ok: true, data: [], warning: "MongoDB disconnected" });
    }
    const { pageName } = req.query;
    const query = pageName ? { pageName } : {};
    const sections = await Section.find(query);
    res.json({ ok: true, data: sections });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/sections/:sectionId', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ ok: true, data: { section: null, elements: [] }, warning: "MongoDB disconnected" });
    }
    const section = await Section.findOne({ sectionId: req.params.sectionId });
    const elements = await Elements.find({ sectionId: req.params.sectionId });
    res.json({ ok: true, data: { section, elements } });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- ELEMENTS API ROUTES ---
app.get('/api/elements', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ ok: true, data: [], warning: "MongoDB disconnected" });
    }
    const { pageName, sectionId } = req.query;
    let query = {};
    if (pageName) query.pageName = pageName;
    if (sectionId) query.sectionId = sectionId;

    const elements = await Elements.find(query);
    res.json({ ok: true, data: elements });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// PATCH /api/elements/:fieldId with UPSERT support
app.patch('/api/elements/:fieldId', async (req, res) => {
  try {
    const { fieldId } = req.params;
    const { content, css, pageName, sectionId, elementName, contentType } = req.body;

    let updateData = { fieldId, pageName: pageName || 'Home' };
    if (content !== undefined) updateData.content = content;
    if (css !== undefined) updateData.css = css;
    if (sectionId !== undefined) updateData.sectionId = sectionId;
    if (elementName !== undefined) updateData.elementName = elementName;
    if (contentType !== undefined) updateData.contentType = contentType;

    const updatedElement = await Elements.findOneAndUpdate(
      { fieldId },
      { $set: updateData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (sectionId) {
      try {
        await Section.findOneAndUpdate(
          { sectionId },
          { $setOnInsert: { sectionId, sectionName: 'Custom Section', pageName: pageName || 'Home', isGenerated: true, variations: "1" } },
          { upsert: true }
        );
      } catch (secErr) {
        console.warn("Section upsert warning:", secErr.message);
      }
    }

    res.json({ ok: true, data: updatedElement });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- WIREFRAME GENERATE ROUTE ---
app.post('/api/generate', upload.single('wireframe'), async (req, res) => {
  try {
    const { prompt, pageName = 'Home', sectionName = 'Custom' } = req.body;
    const wireframeFile = req.file;

    if (!wireframeFile) {
      return res.status(400).json({ ok: false, error: "Please upload a wireframe image." });
    }

    const imageBuffer = fs.readFileSync(wireframeFile.path);
    const base64Image = imageBuffer.toString("base64");

    const reservedFieldIds = {
      headlineMain: generateId('2'),
      subheading: generateId('2'),
      ctaButton: generateId('2'),
      featureCard1: generateId('2'),
      featureCard2: generateId('2'),
      featureCard3: generateId('2')
    };

    const payload = {
      contents: [{
        parts: [
          {
            text: `
You are an expert React frontend developer building a CMS-bound section.

Analyze the uploaded wireframe image and recreate the SINGLE PAGE section shown.

${prompt ? `Additional user instructions: ${prompt}` : ""}

MANDATORY CONTRACT:
- Component name: GeneratedPage.
- Declare "const ids = ${JSON.stringify(reservedFieldIds)};".
- Text nodes carry id={ids.semanticName} and className="dynamicStyle".
- Image nodes carry className="dynamicStyle2" and alt text.
- Buttons carry className="dynamicStyle" and aria-label.
- Use Tailwind CSS utility classes for styling.

Return ONLY valid JSON:
{
  "jsx": "complete React component code",
  "css": "custom CSS rules if required",
  "elements": [
    { "elementName": "Hero Headline", "fieldId": "${reservedFieldIds.headlineMain}", "contentType": "Text", "content": "Default headline copy" },
    { "elementName": "Hero Subtitle", "fieldId": "${reservedFieldIds.subheading}", "contentType": "Textfield", "content": "Default subtitle copy" },
    { "elementName": "Hero Action Button", "fieldId": "${reservedFieldIds.ctaButton}", "contentType": "Button", "content": "Get Started" },
    { "elementName": "Feature Card One", "fieldId": "${reservedFieldIds.featureCard1}", "contentType": "Cards", "content": "Feature One Copy" },
    { "elementName": "Feature Card Two", "fieldId": "${reservedFieldIds.featureCard2}", "contentType": "Cards", "content": "Feature Two Copy" },
    { "elementName": "Feature Card Three", "fieldId": "${reservedFieldIds.featureCard3}", "contentType": "Cards", "content": "Feature Three Copy" }
  ]
}
`
          },
          { inline_data: { mime_type: wireframeFile.mimetype, data: base64Image } }
        ]
      }]
    };

    const text = await callGeminiAPI(payload);
    const result = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());

    const saved = await persistGeneratedSection({ pageName, sectionName, result, wireframePath: wireframeFile.path });

    res.json({
      ok: true,
      jsx: result.jsx,
      css: result.css || "",
      sectionId: saved.sectionId,
      elementIds: saved.elementIds
    });

  } catch (err) {
    console.error("Generate Error:", err.message);
    const isRateLimit = err.message.includes("429");
    res.status(isRateLimit ? 429 : 500).json({ ok: false, error: err.message });
  }
});

// --- PROMPT UI GENERATE ROUTE ---
app.post("/api/prompt-ui", async (req, res) => {
  try {
    const { prompt, pageName = 'Home', sectionName = 'Custom' } = req.body;

    if (!prompt) {
      return res.status(400).json({ ok: false, error: "Prompt is required." });
    }

    const reservedFieldIds = {
      headlineMain: generateId('2'),
      subheading: generateId('2'),
      ctaButton: generateId('2'),
      card1: generateId('2'),
      card2: generateId('2'),
      card3: generateId('2')
    };

    const payload = {
      contents: [{
        parts: [
          {
            text: `
Generate a complete React UI for prompt: ${prompt}

MANDATORY CONTRACT:
- Component name: GeneratedPage.
- Declare "const ids = ${JSON.stringify(reservedFieldIds)};".
- Text nodes carry id={ids.semanticName} and className="dynamicStyle".
- Buttons carry className="dynamicStyle" and aria-label.
- Use Tailwind CSS utility classes.

Return EXACTLY in format:
===JSX===
[complete React component code]
===CSS===
[complete CSS code]
===ELEMENTS===
[JSON array of element objects with elementName, fieldId, contentType, content]
`
          }
        ]
      }]
    };

    const text = await callGeminiAPI(payload);

    const jsxMarker = "===JSX===";
    const cssMarker = "===CSS===";
    const elementsMarker = "===ELEMENTS===";

    const jsxStart = text.indexOf(jsxMarker);
    const cssStart = text.indexOf(cssMarker);
    const elementsStart = text.indexOf(elementsMarker);

    let jsx = "", css = "", elements = [];

    if (jsxStart !== -1 && cssStart !== -1) {
      jsx = text.substring(jsxStart + jsxMarker.length, cssStart).trim();
      if (elementsStart !== -1) {
        css = text.substring(cssStart + cssMarker.length, elementsStart).trim();
        try {
          elements = JSON.parse(text.substring(elementsStart + elementsMarker.length).trim());
        } catch {
          elements = [];
        }
      } else {
        css = text.substring(cssStart + cssMarker.length).trim();
      }
    } else {
      throw new Error("Gemini returned invalid format.");
    }

    const saved = await persistGeneratedSection({
      pageName,
      sectionName,
      result: { jsx, css, elements },
      wireframePath: null
    });

    res.json({
      ok: true,
      jsx,
      css,
      sectionId: saved.sectionId,
      elementIds: saved.elementIds
    });

  } catch (err) {
    console.error("Prompt UI Error:", err.message);
    const isRateLimit = err.message.includes("429");
    res.status(isRateLimit ? 429 : 500).json({ ok: false, error: err.message });
  }
});

// --- PROMPT UI UPDATE ROUTE ---
app.post("/api/prompt-ui-update", async (req, res) => {
  try {
    const { code, css, prompt } = req.body;

    if (!code) return res.status(400).json({ ok: false, error: "React code is required." });
    if (!prompt) return res.status(400).json({ ok: false, error: "Update prompt required." });

    const payload = {
      contents: [{
        parts: [
          {
            text: `
Modify the existing React UI according to prompt: ${prompt}
EXISTING CODE: ${code}
Return response EXACTLY in format:
===JSX===
[complete updated React component]
===CSS===
[complete updated CSS]
`
          }
        ]
      }]
    };

    const text = await callGeminiAPI(payload);

    const jsxMarker = "===JSX===";
    const cssMarker = "===CSS===";

    const jsxStart = text.indexOf(jsxMarker);
    const cssStart = text.indexOf(cssMarker);

    if (jsxStart === -1 || cssStart === -1) {
      throw new Error("Gemini returned an invalid response format.");
    }

    const jsx = text.substring(jsxStart + jsxMarker.length, cssStart).trim();
    const updatedCss = text.substring(cssStart + cssMarker.length).trim();

    res.json({ ok: true, jsx, css: updatedCss });

  } catch (err) {
    console.error("Prompt UI Update Error:", err.message);
    const isRateLimit = err.message.includes("429");
    res.status(isRateLimit ? 429 : 500).json({ ok: false, error: err.message });
  }
});

// --- REACT FEATURE ROUTE ---
app.post('/api/react-feature', async (req, res) => {
  try {
    const { code, prompt } = req.body;

    if (!code) return res.status(400).json({ ok: false, error: "React code is required." });
    if (!prompt) return res.status(400).json({ ok: false, error: "Please provide a prompt." });

    const payload = {
      contents: [{
        parts: [
          {
            text: `
Modify React code according to prompt: ${prompt}
CODE: ${code}
Return ONLY valid JSON:
{
  "jsx": "complete updated React component code",
  "css": "updated CSS if required"
}
`
          }
        ]
      }]
    };

    const text = await callGeminiAPI(payload);
    const result = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());

    res.json({ ok: true, jsx: result.jsx, css: result.css || "" });

  } catch (err) {
    console.error("React Feature Error:", err.message);
    const isRateLimit = err.message.includes("429");
    res.status(isRateLimit ? 429 : 500).json({ ok: false, error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});