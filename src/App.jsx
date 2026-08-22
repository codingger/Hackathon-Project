import { useState } from "react";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [reactCode, setReactCode] = useState("");
  const [cssCode, setCssCode] = useState("");
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);

  const generateUI = async () => {
    if (!file) {
      alert("Please upload a wireframe first.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("wireframe", file);
    formData.append("prompt", prompt);

    try {
      const response = await fetch(
        "http://localhost:3000/api/generate",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error);
      }

      // Store generated React code
      setReactCode(data.jsx);
      setCssCode(data.css);

      // Create a page that compiles and renders Gemini's JSX
      const safeJSX = data.jsx.replace(/<\/script>/gi, "<\\/script>");
      const safeCSS = data.css.replace(/<\/style>/gi, "<\\/style>");

      const previewHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            ${safeCSS}
          </style>
        </head>

        <body>

          <div id="root"></div>

          <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

          <script type="text/babel">

            ${safeJSX}

            const root = ReactDOM.createRoot(
              document.getElementById("root")
            );

            root.render(<GeneratedPage />);

          </script>

        </body>
        </html>
      `;

      setPreview(previewHTML);

    } catch (error) {
      console.error(error);
      alert(error.message);
    }

    setLoading(false);
  };

  return (
    <div>

      <h1>AI UI Generator</h1>

      <h2>Upload Wireframe</h2>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files[0])}
      />

      {file && (
        <div>
          <h2>Wireframe Preview</h2>

          <img
            src={URL.createObjectURL(file)}
            alt="Wireframe"
            width="500"
          />
        </div>
      )}

      <h2>Prompt</h2>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Add additional instructions..."
      />

      <br />

      <button onClick={generateUI}>
        {loading ? "Generating..." : "Generate UI"}
      </button>

      <h2>Generated UI</h2>

      <iframe
        title="Generated React UI"
        srcDoc={preview}
        width="100%"
        height="600"
      />

      <h2>React JSX</h2>

      <pre>
        <code>{reactCode}</code>
      </pre>

      <h2>CSS</h2>

      <pre>
        <code>{cssCode}</code>
      </pre>

    </div>
  );
}

export default App;