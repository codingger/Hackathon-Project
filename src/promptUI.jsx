import { useState } from "react";
import "./promptUI.css";

function PromptUI() {
    const [prompt, setPrompt] = useState("");
    const [updatePrompt, setUpdatePrompt] = useState("");
    const [code, setCode] = useState("");
    const [css, setCss] = useState("");
    const [preview, setPreview] = useState("");
    const [loading, setLoading] = useState(false);

    const createPreview = (jsx, css = "") => {
        let cleanCode = jsx;

        // Remove imports
        cleanCode = cleanCode.replace(
            /import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"];?/g,
            ""
        );

        cleanCode = cleanCode.replace(
            /import\s+.*?from\s*['"][^'"]+['"];?/g,
            ""
        );

        cleanCode = cleanCode.replace(
            /import\s+['"][^'"]+['"];?/g,
            ""
        );

        // Remove React hook declarations
        cleanCode = cleanCode.replace(
            /(?:const|let|var)\s*\{\s*useState(?:\s*,[^}]*)?\s*\}\s*=\s*React\s*;?/g,
            ""
        );

        cleanCode = cleanCode.replace(
            /(?:const|let|var)\s+useState\s*=\s*React\.useState\s*;?/g,
            ""
        );

        // Find component name
        let componentName = "GeneratedPage";

        const functionMatch = cleanCode.match(
            /function\s+([A-Za-z_$][\w$]*)\s*\(/
        );

        if (functionMatch) {
            componentName = functionMatch[1];
        }

        // Remove exports
        cleanCode = cleanCode.replace(
            /export\s+default\s+/g,
            ""
        );

        cleanCode = cleanCode.replace(
            /export\s+(?=(function|const|let|var|class))/g,
            ""
        );

        // Prevent </script> from breaking iframe
        cleanCode = cleanCode.replace(
            /<\/script>/gi,
            "<\\/script>"
        );

        return `
<!DOCTYPE html>

<html>

<head>

    <meta charset="UTF-8">

    <style>

    body {
        margin: 0;
        font-family: Arial, sans-serif;
    }

    * {
        box-sizing: border-box;
    }

    ${css}

</style>

</head>

<body>

<div id="root"></div>

<script src="https://unpkg.com/react@18/umd/react.development.js"></script>

<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>

<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

<script>

window.onload = function() {

    try {

        const code = ${JSON.stringify(cleanCode)};

        const transformed = Babel.transform(code, {

            presets: [
                ["react", {
                    runtime: "classic"
                }]
            ]

        }).code;

        const executeCode = new Function(

            "React",
            "ReactDOM",
            "useState",
            "useEffect",
            "useContext",
            "useReducer",
            "useRef",
            "useMemo",
            "useCallback",
            "useLayoutEffect",

            transformed + "\\nreturn ${componentName};"

        );

        const Component = executeCode(

            React,
            ReactDOM,

            React.useState,
            React.useEffect,
            React.useContext,
            React.useReducer,
            React.useRef,
            React.useMemo,
            React.useCallback,
            React.useLayoutEffect

        );

        const root = ReactDOM.createRoot(
            document.getElementById("root")
        );

        root.render(
            React.createElement(Component)
        );

    } catch (error) {

        document.getElementById("root").innerHTML = \`
            <div style="
                padding:20px;
                font-family:Arial;
                color:#b00020;
            ">

                <h3>Preview Error</h3>

                <pre style="
                    white-space:pre-wrap;
                ">
\${error.stack || error.message}
                </pre>

            </div>
        \`;

        console.error(error);

    }

};

</script>

</body>

</html>
`;
    };

    const generateUI = async () => {

        if (!prompt) {
            alert("Please enter a prompt.");
            return;
        }

        setLoading(true);

        try {

            const response = await fetch(
                "http://localhost:3000/api/prompt-ui",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({
                        prompt: prompt,
                    }),
                }
            );

            const data = await response.json();

            if (!data.ok) {
                throw new Error(data.error);
            }

            setCode(data.jsx);
            setCss(data.css || "");

            setPreview(
                createPreview(data.jsx, data.css || "")
            );

        } catch (error) {

            console.error(error);

            alert(
                "Failed to generate UI: " +
                error.message
            );

        }

        setLoading(false);
    };

    const updateUI = async () => {

    if (!code) {
        alert("Generate a UI first.");
        return;
    }

    if (!updatePrompt) {
        alert("Please enter an update request.");
        return;
    }

    setLoading(true);

    try {

        const response = await fetch(
            "http://localhost:3000/api/prompt-ui-update",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify({
                    code: code,
                    css: css,
                    prompt: updatePrompt,
                }),
            }
        );

        const data = await response.json();

        if (!data.ok) {
            throw new Error(data.error);
        }

        const updatedCode = data.jsx;

        setCode(updatedCode);

        setCss(data.css || "");

        setPreview(
            createPreview(
                updatedCode,
                data.css || ""
            )
        );

    } catch (error) {

        console.error(error);

        alert(
            "Failed to update UI: " +
            error.message
        );

    }

    setLoading(false);
};

    return (
        <div>

            <h1>Prompt UI Generator</h1>

            <h2>Describe Your UI</h2>

            <textarea
                rows="8"
                placeholder="Example: Create a modern landing page for a fitness app with a navbar, hero section, features and a Get Started button."
                value={prompt}
                onChange={(e) =>
                    setPrompt(e.target.value)
                }
            />

            <br />

            <button
                onClick={generateUI}
                disabled={loading}
            >
                {loading
                    ? "Generating..."
                    : "Generate UI"}
            </button>


            <h2>Preview</h2>

            <iframe
                title="Generated UI Preview"
                srcDoc={preview}
                width="100%"
                height="500"
            />


            <h2>Update UI</h2>

            <textarea
                rows="5"
                placeholder="Example: Add a pricing section below the features."
                value={updatePrompt}
                onChange={(e) =>
                    setUpdatePrompt(e.target.value)
                }
            />

            <br />

            <button
                onClick={updateUI}
                disabled={loading || !code}
            >
                {loading
                    ? "Updating..."
                    : "Apply Changes"}
            </button>


            <h2>React Code</h2>

            <pre>
                <code>
                    {code}
                </code>
            </pre>

        </div>
    );
}

export default PromptUI;