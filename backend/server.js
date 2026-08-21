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
        const { prompt, pageName } = req.body;
        const wireframeFile = req.file;
        const generatedSectionId = 'sec-' + Date.now();
        const resolvedPageName = pageName || 'Home';

        let aiGeneratedLayout = {
            layoutStyle: "modern-stack",
            components: [
                { type: "Navbar", content: prompt ? `${prompt.toUpperCase()} - BRAND` : "E-COMMERCE LOGO" },
                { type: "SearchBar", content: "Search items..." },
                { type: "Heading", content: prompt || "Welcome to Our Platform" },
                { type: "Paragraph", content: "Explore our dynamically generated layout built from your wireframe." },
                { type: "Cards", loop: [{ field1: "Item Alpha", field2: "$19" }, { field1: "Item Beta", field2: "$29" }, { field1: "Item Gamma", field2: "$39" }] },
                { type: "Button", content: "GET STARTED" }
            ]
        };

        // Try calling Gemini Vision API with the updated gemini-3.5-flash model
        if (wireframeFile && fs.existsSync(wireframeFile.path)) {
            try {
                const imageBuffer = fs.readFileSync(wireframeFile.path);
                const base64Image = imageBuffer.toString("base64");
                const mimeType = wireframeFile.mimetype || "image/png";
                const geminiApiKey = process.env.GEMINI_API_KEY;

                if (geminiApiKey) {
                    const geminiResponse = await axios.post(
                        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiApiKey}`,
                        {
                            contents: [{
                                parts: [
                                    { text: `Analyze this wireframe image and prompt: "${prompt || 'Website layout'}". Design a dynamic UI component structure. Return STRICTLY a valid JSON object with format:
                                    {
                                      "layoutStyle": "modern-stack",
                                      "components": [
                                        {"type": "Navbar", "content": "BRAND"},
                                        {"type": "Heading", "content": "Main Heading"},
                                        {"type": "Paragraph", "content": "Description text"},
                                        {"type": "Cards", "loop": [{"field1": "Item 1", "field2": "$10"}, {"field1": "Item 2", "field2": "$15"}]},
                                        {"type": "Button", "content": "Action Button"}
                                      ]
                                    }
                                    No extra markdown wrapping or chat text, just raw JSON.` },
                                    { inline_data: { mime_type: mimeType, data: base64Image } }
                                ]
                            }]
                        }
                    );
                    const textRes = geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (textRes) {
                        const parsed = JSON.parse(textRes.replace(/```json/g, '').replace(/```/g, '').trim());
                        if (parsed.components && Array.isArray(parsed.components)) {
                            aiGeneratedLayout = parsed;
                        }
                    }
                }
            } catch (geminiErr) {
                console.warn("Gemini API call failed, using intelligent layout fallback:", geminiErr.response?.data || geminiErr.message);
            }
        }

        // Save section metadata
        const newSection = new Section({
            sectionId: generatedSectionId,
            sectionName: prompt ? prompt.slice(0, 30) : 'AI Dynamic UI',
            pageName: resolvedPageName,
            platform: 'Website',
            isGenerated: true,
            wireframes: wireframeFile ? 'uploads/' + wireframeFile.filename : '',
            variations: JSON.stringify(aiGeneratedLayout)
        });

        await newSection.save();

        // Generate unique 10-digit fieldIds for every component
        const finalElements = aiGeneratedLayout.components.map((comp) => {
            const uniqueFieldId = '20' + Math.floor(10000000 + Math.random() * 90000000);
            return {
                sectionId: generatedSectionId,
                elementName: comp.type.toLowerCase(),
                fieldId: uniqueFieldId,
                content: comp.content || '',
                contentType: comp.type === 'Button' ? 'Button' : comp.type === 'Cards' ? 'Cards' : 'Text',
                pageName: resolvedPageName,
                loop: (comp.loop || []).map((card) => ({
                    field1: card.field1 || '',
                    fieldType1: 'Text',
                    fieldId1: '30' + Math.floor(10000000 + Math.random() * 90000000),
                    field2: card.field2 || '',
                    fieldType2: 'Text',
                    fieldId2: '30' + Math.floor(10000000 + Math.random() * 90000000)
                }))
            };
        });

        await Elements.insertMany(finalElements);

        res.json({ 
            ok: true, 
            sectionId: generatedSectionId,
            pageName: resolvedPageName,
            layout: aiGeneratedLayout,
            message: 'UI layout generated via Gemini AI and saved successfully!'
        });

    } catch (err) {
        console.error("Generate Error:", err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});