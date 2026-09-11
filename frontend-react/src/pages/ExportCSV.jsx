import { useState } from 'react';

export default function ExportCSV({ data, filename = 'export.csv' }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    if (!data || data.length === 0) return;

    setExporting(true);

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(h => {
          const val = row[h] != null ? String(row[h]) : '';
          return val.includes(',') || val.includes('"') || val.includes('\n')
            ? `"${val.replace(/"/g, '""')}"`
            : val;
        }).join(',')
      ),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setTimeout(() => setExporting(false), 500);
  };

  return (
    <button
      onClick={handleExport}
      disabled={!data || data.length === 0 || exporting}
      className="text-xs font-semibold px-4 py-2 rounded-full bg-surface border border-border text-gray-600 hover:bg-paper hover:border-seal/50 hover:text-seal transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {exporting ? 'Exporting...' : 'Export CSV'}
    </button>
  );
}
