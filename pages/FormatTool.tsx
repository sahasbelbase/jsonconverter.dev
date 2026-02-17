import React, { useState, useEffect } from 'react';
import FormatConverter from '../components/FormatConverter';
import SeoHead from '../components/SeoHead';

const FormatTool = () => {
  const [val, setVal] = useState(() => localStorage.getItem('formatInput') || '');
  useEffect(() => { localStorage.setItem('formatInput', val); }, [val]);

  return (
    <div className="h-full flex flex-col">
       <SeoHead 
         title="JSON to YAML, XML, TOML Converter | Format Tools" 
         description="Convert JSON to YAML, XML, TOML, or Plain Text instantly. Free developer tool for configuration file conversion."
         path="/format-converter"
         keywords="json to yaml, json to xml, json to toml, format converter, json to properties, yaml converter"
      />
      
      <div className="flex-1 min-h-0">
        <FormatConverter initialValue={val} onValueChange={setVal} />
      </div>

      <article className="mt-8 prose dark:prose-invert max-w-none px-4 pb-8 border-t border-gray-200 dark:border-gray-800 pt-8">
        <h1 className="text-2xl font-bold mb-4">Universal Format Converter</h1>
        <p>
          Easily convert <strong>JSON</strong> data into other popular configuration formats like <strong>YAML</strong>, <strong>XML</strong>, <strong>TOML</strong>, and <strong>Properties</strong> files.
          This tool is essential for DevOps engineers and developers working with various config standards.
        </p>
        
        <h3 className="text-lg font-semibold mt-4 mb-2">Supported Conversions</h3>
        <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-400">
          <li><strong>JSON to YAML:</strong> Great for Kubernetes manifests and CI/CD configs.</li>
          <li><strong>JSON to XML:</strong> Useful for legacy systems and SOAP APIs.</li>
          <li><strong>JSON to TOML:</strong> Common in Rust and Python projects (Cargo, Poetry).</li>
        </ul>
      </article>
    </div>
  );
};

export default FormatTool;