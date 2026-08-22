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

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("Connected to MongoDB successfully."))
    .catch((err) => console.log("MongoDB connection error:", err));

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
                text:`
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

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});