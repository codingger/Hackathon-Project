# ForgeKit AI — AI-Assisted UI Generation & CMS Platform (PS7)

A full-stack AI-driven web development studio and CMS platform that converts wireframe sketches and textual prompts into contract-bound React components, with real-time MongoDB persistence and interactive hand editing.

---

## 🚀 Quick Setup & Run Instructions

### 1. Prerequisites
- Node.js 18+ and npm
- MongoDB running locally (`mongodb://127.0.0.1:27017/forgekit`) or a MongoDB Atlas connection string
- A Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Open .env and add your GEMINI_API_KEY and MONGODB_URI
npm start
```
*Note for MongoDB Atlas Users: Ensure your Atlas Security -> Network Access settings allow connections from `0.0.0.0/0` (Allow Access from Anywhere).*  
*Backend runs at `http://localhost:3000` (API base: `http://localhost:3000/api`).*

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
*Frontend app runs at `http://localhost:5173`.*

---

## 🎬 3-Step Demo Script for Judges

1. **Step 1 — Generate UI from Wireframe or Prompt**:
   - Go to **Wireframe Studio** (`/wireframe`), upload a sketch, and click **Generate React Component** (or click **Prompt UI** `/prompt` to generate from text).
   - See the interactive React component render inside the live canvas using **Tailwind CSS**.

2. **Step 2 — Open in CMS Studio & Edit Content**:
   - Click the **`⚙️ Open in CMS Studio (#108241...)`** button on the stage header.
   - Edit any headline, subtitle, or button text field in the CMS control panel.
   - Click **Save & Sync** to persist updates directly to MongoDB.

3. **Step 3 — Confirm MongoDB Persistence & API Integration**:
   - Refresh the page or open `http://localhost:3000/api/sections/:sectionId` in your browser.
   - Confirm that `Section` metadata and 10-digit `Element` documents (`fieldId`: e.g. `2082410981`) are fully persisted and returned by MongoDB.

---

## 🏗️ Architecture & Contract Alignment

- **Component Contract**:
  Every generated component is named `GeneratedPage` and binds to 10-digit numeric `fieldIds` using `const ids = { ... }`.
- **Styling Contract**:
  Every text node carries `className="dynamicStyle"`, every image carries `className="dynamicStyle2"`, and buttons carry `aria-label`.
- **Live Preview Sandbox**:
  `PreviewSandbox.jsx` runs generated components inside a sandboxed iframe with React 18, Babel Standalone, and **Tailwind CSS CDN** injected.
- **MongoDB Persistence Pipeline**:
  Generates `Section` and `Element` documents upon generation via `/api/generate` and `/api/prompt-ui`.

---

## 📑 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | `GET` | Health check endpoint returning Mongo status |
| `/api/generate` | `POST` | Generates component from wireframe image & persists section/elements |
| `/api/prompt-ui` | `POST` | Generates component from text prompt & persists section/elements |
| `/api/sections` | `GET` | Lists all persisted sections |
| `/api/sections/:sectionId` | `GET` | Fetches section metadata and all element documents for a section |
| `/api/elements` | `GET` | Lists element documents by pageName/sectionId |
| `/api/elements/:fieldId` | `PATCH` | Updates element content/css in MongoDB with upsert support |

---

## 📌 Documented Limitations & Architectural Choices
- Client state uses React local state (`useState`) with URL query persistence (`/cms?sectionId=...`) instead of Redux Toolkit.
- PrimeReact is installed for studio UI controls, while preview sandbox components use standard semantic buttons with `id`, `className`, and `aria-label` to prevent unpkg ESM import breakage inside Babel standalone.
