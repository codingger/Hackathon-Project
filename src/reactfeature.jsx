import { useState } from "react";

function ReactFeature() {
    const [file, setFile] = useState(null);
    const [code, setCode] = useState("");
    const [prompt, setPrompt] = useState("");
    const [preview, setPreview] = useState("");
    const [loading, setLoading] = useState(false);

    const createPreview = (jsx) => {
        const safeJSX = jsx.replace(/<\/script>/gi, "<\\/script>");

        return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            margin: 0;
            font-family: Arial, sans-serif;
          }
        </style>
      </head>

      <body>
        <div id="root"></div>

        <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
        <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

        <script type="text/babel">
          try {

            ${safeJSX}

            const root = ReactDOM.createRoot(
              document.getElementById("root")
            );

            root.render(<GeneratedPage />);

          } catch (error) {
            document.getElementById("root").innerHTML =
              "<h3>Preview Error</h3><pre>" +
              error.message +
              "</pre>";
          }
        </script>
      </body>
      </html>
    `;
    };

    const handleFileUpload = (e) => {
        const uploadedFile = e.target.files[0];

        if (!uploadedFile) return;

        setFile(uploadedFile);

        const reader = new FileReader();

        reader.onload = (event) => {
            const uploadedCode = event.target.result;

            setCode(uploadedCode);
            setPreview(createPreview(uploadedCode));
        };

        reader.readAsText(uploadedFile);
    };

    const applyChanges = async () => {
        if (!code) {
            alert("Please upload React code first.");
            return;
        }

        if (!prompt) {
            alert("Please enter a prompt.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                "http://localhost:3000/api/react-feature",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        code: code,
                        prompt: prompt,
                    }),
                }
            );

            const data = await response.json();

            if (!data.ok) {
                throw new Error(data.error);
            }

            setCode(data.jsx);

            // Render the newly generated React code
            setPreview(createPreview(data.jsx));

        } catch (error) {
            console.error(error);
            alert("Failed to apply changes: " + error.message);
        }

        setLoading(false);
    };

    return (
        <div>
            <h1>React Feature</h1>

            <h2>Upload React Code</h2>

            <input
                type="file"
                accept=".jsx,.js"
                onChange={handleFileUpload}
            />
            <h2>Or Paste React Code</h2>

            <textarea
                rows="10"
                placeholder="Paste your React code here..."
                value={code}
                onChange={(e) => setCode(e.target.value)}
            />

            <br />

            <button
                onClick={() => {
                    if (!code) {
                        alert("Please paste React code first.");
                        return;
                    }

                    setPreview(createPreview(code));
                }}
            >
                Preview Code
            </button>

            <h2>Preview</h2>

            <iframe
                title="React Preview"
                srcDoc={preview}
                width="100%"
                height="500"
            />

            <h2>Prompt</h2>

            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the changes you want to make..."
            />

            <br />

            <button onClick={applyChanges}>
                {loading ? "Applying Changes..." : "Apply Changes"}
            </button>

            <h2>Updated React Code</h2>

            <pre>
                <code>{code}</code>
            </pre>
        </div>
    );
}

export default ReactFeature;