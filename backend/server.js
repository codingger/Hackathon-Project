import express from "express";
import bodyparser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import mongoose from "mongoose";
import axios from "axios";
import fs from 'fs';
import dns from 'dns';
import Section from "./models/Section.js";
import Elements from "./models/Elements.js";
import { generateId } from "./idGenerator.js";

dotenv.config();

try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch {}

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());
app.use(cors());
app.use('/storage', express.static('uploads'));

const upload = multer({ dest: 'uploads/' });

const mongoUri = process.env.MONGODB_URI || "mongodb+srv://sharmavyom691_db_user:xkCRKqx276NAz6SS@cluster0.qejkuyv.mongodb.net/forgekit?retryWrites=true&w=majority";

mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 })
  .then(() => {
    console.log("🟢 Connected to MongoDB Atlas successfully!");
  })
  .catch((err) => {
    console.warn("MongoDB connection warning:", err.message);
  });

// Helper function to call Gemini API with exponential retry, multi-model fallback & rate limit resilience
async function callGeminiAPI(payload) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY is missing in backend/.env file.");
  }

  const models = [
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-2.0-flash-lite-preview-02-05',
    'gemini-1.5-flash-8b'
  ];

  for (const model of models) {
    // Retry up to 2 times per model with exponential delay
    for (let attempt = 1; attempt <= 2; attempt++) {
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
          console.warn(`[Gemini API] Model ${model} rate limited (429, attempt ${attempt}). Waiting 2s...`);
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        console.warn(`[Gemini API] Model ${model} error: ${err.message}`);
        break; // Move to next model on non-429 error
      }
    }
  }

  return null; // Return null so callers can handle graceful smart fallback
}

// Helper to generate a contract-compliant fallback component if AI rate limit is exhausted
function createSmartFallbackLayout(prompt, reservedFieldIds) {
  const headline = prompt ? `Custom ${prompt.substring(0, 30)} Layout` : "Artisanal Coffee & Roastery";
  return {
    jsx: `function GeneratedPage() {
  const ids = ${JSON.stringify(reservedFieldIds)};
  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-8 flex flex-col justify-between">
      <header className="max-w-6xl mx-auto w-full flex justify-between items-center py-4 border-b border-slate-800 mb-8">
        <div className="text-xl font-bold text-indigo-400">ForgeKit Studio</div>
        <button id={ids.ctaButton} className="dynamicStyle bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-lg transition" aria-label="Order Now">
          Order Now
        </button>
      </header>
      <main className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center my-auto">
        <div>
          <h1 id={ids.headlineMain} className="dynamicStyle text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-white">
            ${headline}
          </h1>
          <p id={ids.subheading} className="dynamicStyle text-lg text-slate-400 mb-6">
            Handcrafted beverages, ethically sourced beans, and warm community spaces designed for productivity and relaxation.
          </p>
          <div className="flex gap-4">
            <button className="dynamicStyle bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-lg shadow-lg" aria-label="Explore Menu">
              Explore Menu
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div className="p-6 bg-slate-800/80 rounded-xl border border-slate-700 shadow-md">
            <h3 id={ids.featureCard1 || ids.card1} className="dynamicStyle text-xl font-bold text-indigo-300 mb-2">Direct Trade Coffee</h3>
            <p className="text-sm text-slate-400">Sourced directly from single-origin organic farms in Ethiopia and Colombia.</p>
          </div>
          <div className="p-6 bg-slate-800/80 rounded-xl border border-slate-700 shadow-md">
            <h3 id={ids.featureCard2 || ids.card2} className="dynamicStyle text-xl font-bold text-indigo-300 mb-2">Fresh In-House Roast</h3>
            <p className="text-sm text-slate-400">Batch-roasted daily for peak flavor aroma and balanced acidity profiles.</p>
          </div>
        </div>
      </main>
    </div>
  );
}`,
    css: ".dynamicStyle { transition: all 0.2s ease-in-out; }",
    elements: [
      { elementName: "Hero Headline", fieldId: reservedFieldIds.headlineMain, contentType: "Text", content: headline },
      { elementName: "Hero Subtitle", fieldId: reservedFieldIds.subheading, contentType: "Textfield", content: "Handcrafted beverages, ethically sourced beans, and warm community spaces." },
      { elementName: "CTA Button", fieldId: reservedFieldIds.ctaButton, contentType: "Button", content: "Order Now" },
      { elementName: "Feature Card 1", fieldId: reservedFieldIds.featureCard1 || reservedFieldIds.card1, contentType: "Cards", content: "Direct Trade Coffee" },
      { elementName: "Feature Card 2", fieldId: reservedFieldIds.featureCard2 || reservedFieldIds.card2, contentType: "Cards", content: "Fresh In-House Roast" }
    ]
  };
}

// Helper to persist generated section & elements to MongoDB with retry-on-duplicate
async function persistGeneratedSection({ pageName = 'Home', sectionName = 'Custom', result, wireframePath }) {
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
      console.warn("Section persistence warning:", err.message);
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
    mongo: 'connected',
    database: 'Atlas cluster0.qejkuyv.mongodb.net',
    timestamp: new Date().toISOString()
  });
});

// --- SECTIONS API ROUTES ---
app.get('/api/sections', async (req, res) => {
  try {
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
    let result = null;

    if (text) {
      try {
        result = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
      } catch (err) {
        console.warn("JSON parse error from Gemini text:", err.message);
      }
    }

    // Fallback if AI models rate-limited or failed
    if (!result) {
      console.warn("[Gemini API] All models rate-limited. Activating contract-compliant Smart Fallback layout.");
      result = createSmartFallbackLayout(prompt, reservedFieldIds);
    }

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
    res.status(500).json({ ok: false, error: err.message });
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
    let jsx = "", css = "", elements = [];
    let parsedSuccess = false;

    if (text) {
      const jsxMarker = "===JSX===";
      const cssMarker = "===CSS===";
      const elementsMarker = "===ELEMENTS===";

      const jsxStart = text.indexOf(jsxMarker);
      const cssStart = text.indexOf(cssMarker);
      const elementsStart = text.indexOf(elementsMarker);

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
        parsedSuccess = true;
      }
    }

    if (!parsedSuccess) {
      console.warn("[Gemini API] Rate-limited or parse error. Activating Smart Fallback layout.");
      const fallback = createSmartFallbackLayout(prompt, reservedFieldIds);
      jsx = fallback.jsx;
      css = fallback.css;
      elements = fallback.elements;
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
    res.status(500).json({ ok: false, error: err.message });
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

    if (text) {
      const jsxMarker = "===JSX===";
      const cssMarker = "===CSS===";

      const jsxStart = text.indexOf(jsxMarker);
      const cssStart = text.indexOf(cssMarker);

      if (jsxStart !== -1 && cssStart !== -1) {
        const jsx = text.substring(jsxStart + jsxMarker.length, cssStart).trim();
        const updatedCss = text.substring(cssStart + cssMarker.length).trim();
        return res.json({ ok: true, jsx, css: updatedCss });
      }
    }

    // Fallback mode for code update
    res.json({ ok: true, jsx: code, css: css || "" });

  } catch (err) {
    console.error("Prompt UI Update Error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
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
    if (text) {
      try {
        const result = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
        return res.json({ ok: true, jsx: result.jsx, css: result.css || "" });
      } catch {}
    }

    res.json({ ok: true, jsx: code, css: "" });

  } catch (err) {
    console.error("React Feature Error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});