# JSON to Excel/CSV Converter

A fast, lightweight, and secure web application to validate, format, and convert JSON data into Excel or CSV formats. Built with privacy and performance in mind.

## Features

*   **JSON Processing**:
    *   **Validation**: Real-time error detection with line/column pointers.
    *   **Formatting/Prettify**: Auto-indentation for readability.
    *   **Minification**: Compress JSON to single line.
    *   **Auto-Fix**: Attempt to fix common JSON errors like missing quotes or trailing commas.
    *   **String Manipulation**: Escape and unescape JSON strings.
*   **Visualizers**:
    *   **Code Editor**: Powerful Monaco editor (VS Code like) with syntax highlighting.
    *   **Tree View**: Interactive collapsible tree structure to navigate large JSON files.
    *   **Split View**: Work with code and tree view simultaneously.
*   **Conversion**:
    *   **Flattening**: Intelligently flattens nested objects and arrays into a tabular format.
    *   **Preview**: Searchable and paginated table preview of your data.
    *   **Export**: Download as `.xlsx` (Excel) or `.csv`.
*   **Developer Tools**:
    *   **Diff Viewer**: Compare JSON, text, or code side-by-side with difference highlighting.
    *   **URL Encoder/Decoder**: Parse URLs, inspect query parameters, and switch between `encodeURI` and `encodeURIComponent` modes. Supports batch processing for multiple lines.
    *   **Format Converter**: Convert JSON to YAML, XML, TOML, or Properties files.
    *   **HTML Viewer**: Real-time HTML preview with beautify/minify capabilities.
    *   **Token Counter**: Estimate token usage and costs for GPT-4/Claude models.
    *   **JWT Decoder**: Debug and verify JSON Web Tokens securely on the client-side.
*   **UX/UI**:
    *   **Dark Mode**: Fully supported dark theme.
    *   **Drag & Drop**: Easy file upload.
    *   **Responsive**: Works on desktop, tablets, and mobile devices.
    *   **Privacy**: All processing happens client-side in the browser. No data is sent to a server.

## Tech Stack

*   **Frontend**: React, TypeScript
*   **Styling**: Tailwind CSS
*   **Editor**: Monaco Editor (`@monaco-editor/react`)
*   **Icons**: Lucide React
*   **Excel Logic**: SheetJS (`xlsx`)
*   **Build Tooling**: Vite / ESM (via CDN for this specific build)

## Credits

Created by **Sahas** .

---
*© 2026 JSON Tools. All rights reserved.*