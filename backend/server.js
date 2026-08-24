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
const port = 3000;

app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());
app.use(cors());
app.use('/storage', express.static('uploads'));

const upload = multer({ dest: 'uploads/' });

mongoose.set('bufferCommands', false);
mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 })
  .then(() => console.log("Connected to MongoDB successfully."))
  .catch((err) => console.warn("MongoDB connection warning:", err.message));

app.get('/api/elements', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      // ponytail: return empty data fallback if MongoDB atlas connection is offline/unreachable
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

// --- GEMINI API INTEGRATED GENERATE ROUTE ---
// --- GEMINI API INTEGRATED GENERATE ROUTE ---
// --- GEMINI API INTEGRATED GENERATE ROUTE ---
app.post('/api/generate', upload.single('wireframe'), async (req, res) => {
  try {
    const { prompt } = req.body;
    const wireframeFile = req.file;

    if (!wireframeFile) {
      return res.status(400).json({
        ok: false,
        error: "Please upload a wireframe."
      });
    }

    const imageBuffer = fs.readFileSync(wireframeFile.path);
    const base64Image = imageBuffer.toString("base64");

    const geminiApiKey = process.env.GEMINI_API_KEY;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiApiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: `
You are an expert React frontend developer.

Analyze the uploaded wireframe image and recreate the SINGLE PAGE shown in the wireframe.

${prompt ? `Additional user instructions: ${prompt}` : ""}

Generate a React JSX component that reproduces the wireframe as accurately as possible.

IMPORTANT:
- The React component MUST be named GeneratedPage.
- The component must start exactly with:
  function GeneratedPage() {
- Do not use any other component name.
- Return the complete component.

Return ONLY valid JSON in this exact format:

{
  "jsx": "React JSX code",
  "css": "CSS code"
}

Requirements:

- Generate ONE React component named GeneratedPage.
- Use clean, reusable React JSX.
- Treat the wireframe as a layout and design reference, NOT as the final content.
- Recreate the structure and visual hierarchy of the wireframe.
- Use semantic HTML elements such as:
  h1, h2, h3, p, img, button, a, section, header, nav, footer.
- Use realistic placeholder text that the developer can easily replace.
- For images, use <img> elements with placeholder image URLs.
- Do not draw images using CSS or SVG unless the wireframe specifically requires an icon.
- Keep text directly inside the JSX so it can easily be edited.
- Use meaningful class names.
- Keep the JSX clean and readable.
- The generated code should be suitable for copying into another React project.
- Do not use Tailwind.
- Do not use external UI libraries.
- Do not create multiple pages.
- Do not include import statements.
- Do not include export statements.
- Do not include markdown.
- Do not include explanations.
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
      }
    );

    const text =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Gemini returned no result.");
    }

    const result = JSON.parse(
      text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim()
    );

    res.json({
      ok: true,
      jsx: result.jsx,
      css: result.css
    });

  } catch (err) {
    console.error(
      "Generate Error:",
      err.response?.data || err.message
    );

    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

app.post('/api/react-feature', async (req, res) => {
  try {
    const { code, prompt } = req.body;

    if (!code) {
      return res.status(400).json({
        ok: false,
        error: "React code is required."
      });
    }

    if (!prompt) {
      return res.status(400).json({
        ok: false,
        error: "Please provide a prompt."
      });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiApiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: `
You are an expert React developer.

The user has provided an existing React component and wants to modify it.

EXISTING REACT CODE:

${code}

USER REQUEST:

${prompt}

Modify the React code according to the user's request.

Rules:
- Preserve the existing functionality unless the user specifically asks to change it.
- Preserve existing functionality unless the user specifically asks to change it.
- Preserve existing structure when it is not affected by the user's request.
- If the user's request requires structural changes, freely modify the component structure to satisfy the request.
- Return the COMPLETE updated React component.
- Return valid React JSX.
- Keep the component name unchanged.
- Do not include import statements unless they are necessary.
- Do not include export statements.
- Do not use markdown.
- Do not include explanations.

Return ONLY valid JSON:

{
  "jsx": "complete updated React component code",
  "css": "updated CSS if required"
}
`
              }
            ]
          }
        ]
      }
    );

    const text =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Gemini returned no result.");
    }

    const result = JSON.parse(
      text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim()
    );

    res.json({
      ok: true,
      jsx: result.jsx,
      css: result.css || ""
    });

  } catch (err) {
    console.error(
      "React Feature Error:",
      err.response?.data || err.message
    );

    res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

app.post("/api/prompt-ui", async (req, res) => {
    try {

        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({
                ok: false,
                error: "Prompt required"
            });
        }

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [
                    {
                        parts: [
                            {
                                text: `
You are an expert React frontend developer.

Generate a complete React UI based on this user prompt:

${prompt}

IMPORTANT RULES:

- Generate ONE complete React component.
- The component MUST be named GeneratedPage.
- Start with:
function GeneratedPage() {

- Do NOT use import statements.
- Do NOT use export statements.
- Do NOT use lucide-react.
- Do NOT use external libraries.
- Do NOT use external React components.
- Use only React, standard HTML and CSS.
- The component must work with React 18 loaded from a CDN.
- Use React hooks such as useState only when necessary.
- Keep the JSX completely self-contained.

Return your response EXACTLY in this format:

===JSX===
[complete React component here]

===CSS===
[complete CSS here]

Do not use markdown.
Do not use code fences.
Do not add explanations.
`
                            }
                        ]
                    }
                ]
            }
        );

        const text =
            response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error("Gemini returned no result.");
        }

        const jsxMarker = "===JSX===";
        const cssMarker = "===CSS===";

        const jsxStart = text.indexOf(jsxMarker);
        const cssStart = text.indexOf(cssMarker);

        if (jsxStart === -1 || cssStart === -1) {
            throw new Error("Gemini returned an invalid format.");
        }

        const jsx = text
            .substring(
                jsxStart + jsxMarker.length,
                cssStart
            )
            .trim();

        const css = text
            .substring(
                cssStart + cssMarker.length
            )
            .trim();

        res.json({
            ok: true,
            jsx: jsx,
            css: css
        });

    } catch (err) {

        console.error(
            "Prompt UI Error:",
            err.response?.data || err.message
        );

        res.status(500).json({
            ok: false,
            error: err.response?.data || err.message
        });

    }
});

app.post("/api/prompt-ui-update", async (req, res) => {
    try {

        const { code, css, prompt } = req.body;

        if (!code) {
            return res.status(400).json({
                ok: false,
                error: "React code is required."
            });
        }

        if (!prompt) {
            return res.status(400).json({
                ok: false,
                error: "Update prompt required."
            });
        }

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [
                    {
                        parts: [
                            {
                                text: `
You are an expert React frontend developer.

You are modifying an existing React UI.

EXISTING REACT CODE:

${code}

EXISTING CSS:

${css || ""}

USER REQUEST:

${prompt}

Modify the existing UI according to the user's request.

IMPORTANT RULES:

- Return the COMPLETE updated React component.
- Keep the component name as GeneratedPage.
- Preserve existing functionality unless the user asks to change it.
- Preserve the existing design unless the user asks to change it.
- Use only React and standard HTML.
- Do NOT use import statements.
- Do NOT use export statements.
- Do NOT use lucide-react.
- Do NOT use external libraries.
- Keep the component completely self-contained.
- Return the COMPLETE updated CSS as well.
- Do not remove existing CSS unless it is no longer needed.

Return the response EXACTLY in this format:

===JSX===
[complete updated React component here]

===CSS===
[complete updated CSS here]

Do not use markdown.
Do not use code fences.
Do not add explanations.
Do not add anything before ===JSX===.
Do not add anything after the CSS.
`
                            }
                        ]
                    }
                ]
            }
        );

        const text =
            response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error("Gemini returned no result.");
        }

        const jsxMarker = "===JSX===";
        const cssMarker = "===CSS===";

        const jsxStart = text.indexOf(jsxMarker);
        const cssStart = text.indexOf(cssMarker);

        if (jsxStart === -1 || cssStart === -1) {
            throw new Error("Gemini returned an invalid format.");
        }

        const jsx = text
            .substring(
                jsxStart + jsxMarker.length,
                cssStart
            )
            .trim();

        const updatedCss = text
            .substring(
                cssStart + cssMarker.length
            )
            .trim();

        res.json({
            ok: true,
            jsx: jsx,
            css: updatedCss
        });

    } catch (err) {

        console.error(
            "Prompt UI Update Error:",
            err.response?.data || err.message
        );

        res.status(500).json({
            ok: false,
            error: err.response?.data || err.message
        });

    }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});