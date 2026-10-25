import React, { useCallback, useState } from 'react';
import InputArea from '../components/InputArea';
import PreviewTable from '../components/PreviewTable';
import ToolShell from '../components/ToolShell';
import { exportToCSV, exportToExcel } from '../utils/exportUtils';
import { useJsonWorker } from '../lib/useJsonWorker';
import { useLocalStorageState } from '../lib/useLocalStorageState';
import { useToast } from '../lib/toast';
import { TOOL_BY_PATH } from '../lib/tools';
import { type ParsedData, ViewMode } from '../types';

const tool = TOOL_BY_PATH.get('/')!;

const ConverterPage: React.FC = () => {
  const [jsonInput, setJsonInput] = useLocalStorageState('jsonInput');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.INPUT);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const runJson = useJsonWorker();

  // Flattening a multi-megabyte document is a full walk plus a column union.
  // It runs in a worker so the button stays responsive and the spinner spins.
  const processData = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    const response = await runJson('flatten', jsonInput);

    if (response.ok && response.kind === 'flatten') {
      const { data } = response;
      setParsedData(data);
      setViewMode(ViewMode.PREVIEW);
      toast.success(
        `Flattened ${data.originalSize.toLocaleString()} record${data.originalSize === 1 ? '' : 's'} into ${data.headers.length} column${data.headers.length === 1 ? '' : 's'}.`
      );
    } else if (!response.ok) {
      setError(response.message);
    }

    setIsProcessing(false);
  }, [jsonInput, runJson, toast]);

  const handleExport = (kind: 'csv' | 'xlsx') => {
    if (!parsedData) return;
    try {
      if (kind === 'csv') exportToCSV(parsedData.rows, 'json_export');
      else exportToExcel(parsedData.rows, 'json_export');
      toast.success(`${kind.toUpperCase()} file downloaded.`);
    } catch (e) {
      toast.error(`Could not export ${kind.toUpperCase()}: ${(e as Error).message}`);
    }
  };

  return (
    <ToolShell
      tool={tool}
      article={
        <>
          <h2>Convert JSON to Excel or CSV in your browser</h2>
          <p>
            Paste or drop a JSON file, check it against the live validator, then flatten it into a
            spreadsheet. Nested objects become dotted column names (<code>user.address.city</code>)
            and array items get an index (<code>tags[0]</code>), so a deeply nested document still
            lands as a flat table you can open in Excel, Numbers or Google Sheets.
          </p>
          <p>
            Every step runs on your own machine. The file is never uploaded, which means you can
            safely paste an API response that contains customer data or credentials.
          </p>
          <h3>What the validator catches</h3>
          <ul>
            <li>Trailing commas, unquoted keys and single-quoted strings.</li>
            <li>Smart quotes pasted from a document or a chat window.</li>
            <li>
              Python and MongoDB literals — <code>None</code>, <code>True</code>,{' '}
              <code>ObjectId(...)</code>, <code>ISODate(...)</code> — which Auto-Fix rewrites to
              valid JSON.
            </li>
            <li>The exact line and column of a syntax error, highlighted in the editor.</li>
          </ul>
        </>
      }
    >
      {viewMode === ViewMode.INPUT ? (
        <InputArea
          value={jsonInput}
          onChange={(value) => {
            setJsonInput(value);
            if (error) setError(null);
          }}
          onProcess={processData}
          isProcessing={isProcessing}
          error={error}
        />
      ) : (
        parsedData && (
          <PreviewTable
            data={parsedData}
            onExportCSV={() => handleExport('csv')}
            onExportExcel={() => handleExport('xlsx')}
            onBack={() => {
              setViewMode(ViewMode.INPUT);
              setError(null);
            }}
          />
        )
      )}
    </ToolShell>
  );
};

export default ConverterPage;
