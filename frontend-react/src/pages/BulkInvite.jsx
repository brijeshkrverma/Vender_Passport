import { useState } from 'react';
import { useToast } from '../components/Toast';

export default function BulkInvite() {
  const { toast } = useToast();
  const [csv, setCsv] = useState('');
  const [rows, setRows] = useState([]);
  const [validated, setValidated] = useState(false);
  const [errors, setErrors] = useState({});

  const parseCSV = () => {
    const lines = csv.trim().split('\n').filter(Boolean);
    if (lines.length < 2) {
      toast('Invalid CSV', 'Paste at least a header row and one data row', 'error');
      return;
    }

    const parsed = [];
    const errs = {};

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      const name = (cols[0] || '').trim();
      const email = (cols[1] || '').trim();

      const rowErrors = [];
      if (!name) rowErrors.push('Missing company name');
      if (!email) rowErrors.push('Missing email');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) rowErrors.push('Invalid email');

      parsed.push({ name, email, valid: rowErrors.length === 0 });
      if (rowErrors.length > 0) errs[i - 1] = rowErrors;
    }

    setRows(parsed);
    setErrors(errs);
    setValidated(true);

    if (Object.keys(errs).length === 0) {
      toast('CSV parsed', `${parsed.length} valid rows`, 'success');
    } else {
      toast('Validation issues', `${Object.keys(errs).length} rows have errors`, 'warning');
    }
  };

  const sendInvites = async () => {
    const validRows = rows.filter(r => r.valid);
    if (validRows.length === 0) {
      toast('No valid rows', 'Resolve errors before sending', 'error');
      return;
    }

    for (const row of validRows) {
      await new Promise(r => setTimeout(r, 400));
      toast(`Invited ${row.name}`, row.email, 'success');
    }
  };

  const validCount = rows.filter(r => r.valid).length;
  const errCount = Object.keys(errors).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-display font-semibold text-ink-900">Bulk Invite Vendors</h1>
        <p className="text-sm text-gray-500">Paste CSV to invite multiple vendors at once</p>
      </div>

      <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
        <div>
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">
            Paste CSV (Company Name, Email)
          </label>
          <textarea
            value={csv}
            onChange={e => { setCsv(e.target.value); setValidated(false); }}
            placeholder="Company Name, Email&#10;ACME Corp, contact@acme.com&#10;Globex Inc, info@globex.com"
            rows={6}
            className="w-full border border-border rounded-lg p-3 text-xs font-mono text-ink-900 resize-y focus:outline-none focus:border-seal/50 bg-paper/30"
          />
        </div>

        <button
          onClick={parseCSV}
          disabled={!csv.trim()}
          className="text-xs font-semibold px-5 py-2 rounded-full bg-ink-900 text-white hover:bg-ink-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Parse CSV
        </button>
      </div>

      {validated && rows.length > 0 && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-paper/30">
            <span className="text-xs font-semibold text-ink-900">
              Preview ({rows.length} rows)
            </span>
            <span className="text-[10px] text-gray-400">
              {validCount} valid{errCount > 0 ? `, ${errCount} with errors` : ''}
            </span>
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-paper/50 text-gray-500">
                <th className="text-left px-4 py-2.5 font-medium">#</th>
                <th className="text-left px-4 py-2.5 font-medium">Company Name</th>
                <th className="text-left px-4 py-2.5 font-medium">Email</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={`border-b border-border/50 ${!row.valid ? 'bg-danger-bg/30' : ''}`}>
                  <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-2.5 text-ink-900 font-medium">{row.name || '—'}</td>
                  <td className="px-4 py-2.5 text-ink-900 font-mono">{row.email || '—'}</td>
                  <td className="px-4 py-2.5">
                    {row.valid ? (
                      <span className="badge badge-success">Valid</span>
                    ) : (
                      <div>
                        <span className="badge badge-danger">Invalid</span>
                        {errors[i] && (
                          <div className="text-[10px] text-danger mt-0.5">
                            {errors[i].join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end px-4 py-3 border-t border-border">
            <button
              onClick={sendInvites}
              disabled={validCount === 0}
              className="text-xs font-semibold px-5 py-2 rounded-full bg-seal text-white hover:bg-seal-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Send {validCount} Invite{validCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
