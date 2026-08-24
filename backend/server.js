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

  // Model fallback order in case of rate limits or unavailable models
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

// PATCH route for live content edits
app.patch('/api/elements/:fieldId', async (req, res) => {
  try {
    const { fieldId } = req.params;
    const { content, css, pageName } = req.body;

    let updateData = {};
    if (content !== undefined) updateData.content = content;
    if (css !== undefined) updateData.css = css;

    const updatedElement = await Elements.findOneAndUpdate(
      { fieldId, pageName: pageName || 'Home' },
      { $set: updateData },
      { new: true }
    );

    if (!updatedElement) {
      return res.status(404).json({ ok: false, error: "Element not found" });
    }

    res.json({ ok: true, data: updatedElement });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- WIREFRAME GENERATE ROUTE ---
app.post('/api/generate', upload.single('wireframe'), async (req, res) => {
  try {
    const { prompt } = req.body;
    const wireframeFile = req.file;

    if (!wireframeFile) {
      return res.status(400).json({
        ok: false,
        error: "Please upload a wireframe image."
      });
    }

    const imageBuffer = fs.readFileSync(wireframeFile.path);
    const base64Image = imageBuffer.toString("base64");

    const payload = {
      contents: [
        {
          parts: [
            {
              text: `
You are an expert React frontend developer.

Analyze the uploaded wireframe image and recreate the SINGLE PAGE shown in the wireframe.

${prompt ? `Additional user instructions: ${prompt}` : ""}

Generate a React JSX component that reproduces the wireframe layout.

IMPORTANT:
- The React component MUST be named GeneratedPage.
- The component must start with: function GeneratedPage() {
- Do not use Tailwind or external UI libraries.
- Do not include import/export statements or markdown code blocks.

Return ONLY valid JSON in this exact format:
{
  "jsx": "complete React component code",
  "css": "complete CSS styles"
}
`
            },
            {
              inline_data: {
                mime_type: wireframeFile.mimetype,
                data: base64Image
              }
            }
          ]
        }
      ]
    };

    const text = await callGeminiAPI(payload);

    const result = JSON.parse(
      text.replace(/```json/g, "").replace(/```/g, "").trim()
    );

    res.json({
      ok: true,
      jsx: result.jsx,
      css: result.css || ""
    });

  } catch (err) {
    console.error("Generate Error:", err.message);
    const isRateLimit = err.message.includes("429");
    res.status(isRateLimit ? 429 : 500).json({
      ok: false,
      error: err.message
    });
  }
});

// --- REACT FEATURE MODIFIER ROUTE ---
app.post('/api/react-feature', async (req, res) => {
  try {
    const { code, prompt } = req.body;

    if (!code) {
      return res.status(400).json({ ok: false, error: "React code is required." });
    }
    if (!prompt) {
      return res.status(400).json({ ok: false, error: "Please provide a prompt." });
    }

    const payload = {
      contents: [
        {
          parts: [
            {
              text: `
You are an expert React developer.

EXISTING REACT CODE:
${code}

USER REQUEST:
${prompt}

Modify the React code according to the request. Keep component name as GeneratedPage or original function name.
Return ONLY valid JSON in this exact format:
{
  "jsx": "complete updated React component code",
  "css": "updated CSS if required"
}
`
            }
          ]
        }
      ]
    };

    const text = await callGeminiAPI(payload);

    const result = JSON.parse(
      text.replace(/```json/g, "").replace(/```/g, "").trim()
    );

    res.json({
      ok: true,
      jsx: result.jsx,
      css: result.css || ""
    });

  } catch (err) {
    console.error("React Feature Error:", err.message);
    const isRateLimit = err.message.includes("429");
    res.status(isRateLimit ? 429 : 500).json({
      ok: false,
      error: err.message
    });
  }
});

// --- PROMPT UI GENERATE ROUTE ---
app.post("/api/prompt-ui", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ ok: false, error: "Prompt is required." });
    }

    const payload = {
      contents: [
        {
          parts: [
            {
              text: `
You are an expert React frontend developer.

Generate a complete React UI based on this user prompt:
${prompt}

IMPORTANT RULES:
- The component MUST be named GeneratedPage.
- Start with: function GeneratedPage() {
- Do NOT use import/export statements or external libraries.

Return your response EXACTLY in this format:
===JSX===
[complete React component code]
===CSS===
[complete CSS code]
`
            }
          ]
        }
      ]
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
    const css = text.substring(cssStart + cssMarker.length).trim();

    res.json({ ok: true, jsx, css });

  } catch (err) {
    console.error("Prompt UI Error:", err.message);
    const isRateLimit = err.message.includes("429");
    res.status(isRateLimit ? 429 : 500).json({
      ok: false,
      error: err.message
    });
  }
});

// --- PROMPT UI UPDATE ROUTE ---
app.post("/api/prompt-ui-update", async (req, res) => {
  try {
    const { code, css, prompt } = req.body;

    if (!code) {
      return res.status(400).json({ ok: false, error: "React code is required." });
    }
    if (!prompt) {
      return res.status(400).json({ ok: false, error: "Update prompt required." });
    }

    const payload = {
      contents: [
        {
          parts: [
            {
              text: `
You are an expert React frontend developer.

EXISTING REACT CODE:
${code}

EXISTING CSS:
${css || ""}

USER REQUEST:
${prompt}

Modify the existing UI according to the user's request. Keep component name as GeneratedPage.

Return response EXACTLY in this format:
===JSX===
[complete updated React component]
===CSS===
[complete updated CSS]
`
            }
          ]
        }
      ]
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
    res.status(isRateLimit ? 429 : 500).json({
      ok: false,
      error: err.message
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});