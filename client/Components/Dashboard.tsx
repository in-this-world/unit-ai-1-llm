import React, { useState } from 'react';

type ResultRow = Record<string, string | number>;

interface ParsedConverterResponse {
  databaseQuery: string;
  databaseQueryResult: ResultRow[];
  executionSkipped?: boolean;
  iterationLogs?: {
    requestId: string;
    logDirectory: string;
    entries: { iteration: number; fileName: string; sql: string }[];
  };
  rawLLMResponse?: string;
}

const Dashboard = () => {
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState('');
  const [promptType, setPromptType] = useState('standard');
  const [iterationCount, setIterationCount] = useState(1);
  const [databaseQuery, setDatabaseQuery] = useState('');
  const [databaseQueryResults, setDatabaseQueryResults] = useState<ResultRow[]>(
    []
  );
  const [executionSkipped, setExecutionSkipped] = useState(false);
  const [iterationLogs, setIterationLogs] = useState<{
    requestId: string;
    logDirectory: string;
    entries: { iteration: number; fileName: string; sql: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [outputFormat, setOutputFormat] = useState('table'); // 'table', 'csv', 'excel', 'html'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setDatabaseQuery('');
    setDatabaseQueryResults([]);
    setExecutionSkipped(false);
    setIterationLogs(null);

    try {
      const converterResponse = await fetch('/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          naturalLanguageQuery,
          promptType,
          iterationCount,
        }),
      });

      if (converterResponse.status !== 200) {
        const parsedError: { err: string } = await converterResponse.json();
        setError(parsedError.err);
      } else {
        const parsedConverterResponse: ParsedConverterResponse =
          await converterResponse.json();
        setDatabaseQuery(parsedConverterResponse.databaseQuery);
        setDatabaseQueryResults(parsedConverterResponse.databaseQueryResult);
        setExecutionSkipped(Boolean(parsedConverterResponse.executionSkipped));
        if (parsedConverterResponse.iterationLogs) {
          setIterationLogs(parsedConverterResponse.iterationLogs);
        }
        if (parsedConverterResponse.rawLLMResponse) {
          console.log(
            'Full LLM Response:\n',
            parsedConverterResponse.rawLLMResponse
          );
        }
      }
    } catch (_err) {
      setError('Error processing your request.');
    } finally {
      setLoading(false);
    }
  };

  // Convert array of objects to CSV string
  const getCSVData = () => {
    if (databaseQueryResults.length === 0) return '';
    const headers = Object.keys(databaseQueryResults[0]).join(',');
    const rows = databaseQueryResults.map((row) =>
      Object.values(row)
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(',')
    );
    return [headers, ...rows].join('\n');
  };

  // Convert array of objects to plain HTML Table markup
  const getHTMLTableMarkup = () => {
    if (databaseQueryResults.length === 0) return '';
    const columns = Object.keys(databaseQueryResults[0]);
    let html =
      '<table border="1" cellpadding="5" cellspacing="0">\n  <thead>\n    <tr>\n';
    columns.forEach((col) => {
      html += `      <th>${col}</th>\n`;
    });
    html += '    </tr>\n  </thead>\n  <tbody>\n';
    databaseQueryResults.forEach((row) => {
      html += '    <tr>\n';
      columns.forEach((col) => {
        html += `      <td>${row[col] ?? ''}</td>\n`;
      });
      html += '    </tr>\n';
    });
    html += '  </tbody>\n</table>';
    return html;
  };

  // Utility to copy text to clipboard
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  // Utility to download text file
  const handleDownloadFile = (
    content: string,
    fileName: string,
    mimeType: string
  ) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderTable = () => {
    if (databaseQueryResults.length === 0) return null;
    const columns = Object.keys(databaseQueryResults[0]);

    return (
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {databaseQueryResults.map((row, index) => (
            <tr key={index}>
              {columns.map((col) => (
                <td key={col}>{row[col]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderSelectedFormat = () => {
    switch (outputFormat) {
      case 'table':
        return renderTable();
      case 'csv': {
        const csvContent = getCSVData();
        return (
          <div className="format-preview">
            <div className="action-buttons">
              <button
                type="button"
                onClick={() => handleCopyToClipboard(csvContent)}
              >
                📋 Copy CSV
              </button>
              <button
                type="button"
                onClick={() =>
                  handleDownloadFile(
                    csvContent,
                    'starwars_export.csv',
                    'text/csv;charset=utf-8;'
                  )
                }
              >
                💾 Download CSV
              </button>
            </div>
            <pre>{csvContent}</pre>
          </div>
        );
      }
      case 'excel': {
        const csvContent = getCSVData();
        // UTF-8 BOM prefix (\uFEFF) forces Excel to read the CSV as UTF-8 correctly
        const excelContent = '\uFEFF' + csvContent;
        return (
          <div className="format-preview">
            <p className="hint">
              Tip: Download this format to open directly in Microsoft Excel with
              perfect character encoding.
            </p>
            <div className="action-buttons">
              <button
                type="button"
                onClick={() =>
                  handleDownloadFile(
                    excelContent,
                    'starwars_excel_export.csv',
                    'text/csv;charset=utf-8;'
                  )
                }
              >
                💾 Download for Excel
              </button>
            </div>
            <pre>{csvContent}</pre>
          </div>
        );
      }
      case 'html': {
        const htmlMarkup = getHTMLTableMarkup();
        return (
          <div className="format-preview">
            <div className="action-buttons">
              <button
                type="button"
                onClick={() => handleCopyToClipboard(htmlMarkup)}
              >
                📋 Copy HTML
              </button>
            </div>
            <pre>{htmlMarkup}</pre>
          </div>
        );
      }
      default:
        return renderTable();
    }
  };

  return (
    <div className="container">
      <form onSubmit={handleSubmit}>
        <div className="prompt-selector-container">
          <label htmlFor="prompt-select" className="selector-label">
            Prompting Style:
          </label>
          <select
            id="prompt-select"
            value={promptType}
            onChange={(e) => setPromptType(e.target.value)}
            className="select-dropdown"
          >
            <option value="standard">Standard System Prompt</option>
            <option value="react">ReAct (Reason + Act) Prompt</option>
          </select>
        </div>

        <div className="iteration-control-container">
          <label htmlFor="iteration-count" className="selector-label">
            Iteration Count:
          </label>
          <input
            id="iteration-count"
            type="number"
            min={1}
            max={10}
            value={iterationCount}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              if (!Number.isNaN(parsed)) {
                setIterationCount(
                  Math.min(10, Math.max(1, Math.floor(parsed)))
                );
              }
            }}
            className="iteration-input"
          />
        </div>

        <textarea
          value={naturalLanguageQuery}
          onChange={(e) => setNaturalLanguageQuery(e.target.value)}
          placeholder="Enter your natural language query here..."
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Converting...' : 'Convert and Execute'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {executionSkipped && iterationLogs && (
        <div className="result">
          <h2>Execution Skipped:</h2>
          <p className="warning-text">
            SQL differed across iterations, so no query was executed. Review the
            logs below.
          </p>
          <p className="hint">Log directory: {iterationLogs.logDirectory}</p>
          <div className="iteration-logs">
            {iterationLogs.entries.map((entry) => (
              <div key={entry.fileName} className="iteration-log-card">
                <h3>
                  Iteration {entry.iteration} ({entry.fileName})
                </h3>
                <pre>{entry.sql}</pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {databaseQuery && (
        <div className="result">
          <h2>Generated SQL Query:</h2>
          <pre>{databaseQuery}</pre>
        </div>
      )}

      {databaseQueryResults.length > 0 && (
        <div className="result">
          <div className="result-header">
            <h2>Query Results:</h2>
            <div className="format-selector">
              <button
                type="button"
                className={`format-btn ${outputFormat === 'table' ? 'active' : ''}`}
                onClick={() => setOutputFormat('table')}
              >
                Table
              </button>
              <button
                type="button"
                className={`format-btn ${outputFormat === 'csv' ? 'active' : ''}`}
                onClick={() => setOutputFormat('csv')}
              >
                CSV
              </button>
              <button
                type="button"
                className={`format-btn ${outputFormat === 'excel' ? 'active' : ''}`}
                onClick={() => setOutputFormat('excel')}
              >
                Excel
              </button>
              <button
                type="button"
                className={`format-btn ${outputFormat === 'html' ? 'active' : ''}`}
                onClick={() => setOutputFormat('html')}
              >
                HTML Table
              </button>
            </div>
          </div>
          {renderSelectedFormat()}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
