import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

/*
 * ── WHY THERE IS NO SAMPLE DATA HERE ──────────────────────────────────────
 *
 * This page used to open on eight invented organizations — "Amazon Web
 * Services", "PayPro Financial" and friends — each with a made-up risk score
 * and audit history, held as the initial state. A banner below claimed
 * "nothing is shown rather than something inaccurate", which was not what the
 * code did.
 *
 * On a risk-ranking screen, plausible sample rows are the worst possible
 * placeholder: nobody can tell them from real ones, and the whole purpose of
 * the page is to be believed. An empty table is honest; a populated fake one
 * is a report waiting to be screenshotted.
 */

function computeCadence(score) {
  if (score > 75) return 'Quarterly';
  if (score > 50) return 'Half-Yearly';
  if (score > 25) return 'Annual';
  return 'Continuous Monitoring';
}

/**
 * The organization's risk score, or `null` when it has not been scored.
 *
 * ── WHAT THIS USED TO DO ──────────────────────────────────────────────────
 *
 *   const base = ((org.auditHistory || idx) * 15 + …) % 100;
 *
 * `idx` is the row's position in the list. So an unscored organization was
 * given a risk score derived from **where it happened to appear on screen**,
 * wrapped with `% 100` so the number meant nothing even in principle — and the
 * recommended audit cadence was then derived from that. It also read
 * `org.riskScore`, a field the Organization model does not have (it is `risk`),
 * so the real value was never used and the invented branch always ran.
 *
 * A wrong number here is worse than no number: this page exists to tell someone
 * which vendor to audit next, and it was answering with row order.
 */
function computeRiskScore(org) {
  if (typeof org.risk === 'number') return org.risk;
  // Derivable from real counts, if the organization carries any.
  const findings = Number(org.findingsCount) || 0;
  const certs = Number(org.expiringCerts) || 0;
  if (!findings && !certs) return null;              // not scored — say so
  return Math.max(5, Math.min(99, findings * 10 + certs * 8));
}

const CADENCE_COLORS = {
  'Quarterly': 'badge-danger',
  'Half-Yearly': 'badge-warning',
  'Annual': 'badge-info',
  'Continuous Monitoring': 'badge-success',
};

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }

function riskScoreBg(score) {
  if (score > 75) return 'bg-danger-bg text-danger';
  if (score > 50) return 'bg-warning-bg text-warning';
  if (score > 25) return 'bg-info-bg text-info';
  return 'bg-success-bg text-success';
}

export default function AuditUniverse() {
  const { authHeaders } = useAuth();
  // Empty until the server answers — see the note at the top of the file.
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/organizations', { headers: authHeaders })
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(json => {
        if (!cancelled) {
          const list = json?.data ?? [];
          if (Array.isArray(list) && list.length > 0) {
            const enriched = list.map((org, idx) => {
              const riskScore = computeRiskScore(org);
              return {
                id: org.id || org._id || idx + 1,
                org: org.name || org.orgName || org.org || `Org ${idx + 1}`,
                riskScore,
                // `activeAudits` is a real field on the organization. It used to
                // fall back to `Math.floor(Math.random() * 5) + 1` — a different
                // audit history on every page load.
                auditHistory: typeof org.activeAudits === 'number' ? org.activeAudits : null,
                lastAudit: org.lastAudit || org.lastAuditDate || null,
                nextScheduled: org.nextScheduled || org.nextAuditDate || null,
                // No score, no recommendation. Advising a cadence off a number
                // we do not have is the same invention one step removed.
                recommendedCadence: riskScore === null ? null : computeCadence(riskScore),
              };
            });
            setData(enriched);
          } else {
            setData([]);
            setError(true);
          }
        }
      })
      .catch(() => { if (!cancelled) { setError(true); setData([]); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [authHeaders]);

  const highRisk = data.filter(d => d.riskScore > 50).length;
  const avgScore = Math.round(data.reduce((s, d) => s + d.riskScore, 0) / data.length);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-display font-semibold text-ink-900">Audit Universe</h1>
        <p className="text-sm text-gray-500">Risk-based audit planning across all organizations</p>
      </div>

      {/*
        * Condition used to be `error && data === MOCK_DATA`, which no error
        * path could satisfy — every one of them replaced `data` first. The
        * banner was unreachable, so a failed load looked like an organization
        * list that happened to be empty.
        */}
      {error && (
        <div className="px-4 py-2 bg-warning-bg/20 border border-warning/20 rounded text-[11px] text-warning font-medium">
          Could not load live data from the server — nothing is shown rather than something inaccurate.
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-sm text-gray-400">Loading...</div>
      ) : data.length === 0 ? (
        <div className="p-16 text-center text-sm text-gray-400">No organizations found</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Organizations" value={data.length} icon="◉" color="bg-info-bg text-info" />
            <StatCard label="High Risk" value={highRisk} icon="▲" color="bg-danger-bg text-danger" />
            <StatCard label="Due This Quarter" value="3" icon="◷" color="bg-warning-bg text-warning" />
            <StatCard label="Avg Risk Score" value={avgScore} icon="◆" color="bg-violet-bg text-violet" />
          </div>

          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-paper/50 text-gray-500">
                  <th className="text-left px-4 py-3 font-medium">Organization</th>
                  <th className="text-left px-4 py-3 font-medium">Risk Score</th>
                  <th className="text-left px-4 py-3 font-medium">Audit History</th>
                  <th className="text-left px-4 py-3 font-medium">Last Audit Date</th>
                  <th className="text-left px-4 py-3 font-medium">Next Scheduled</th>
                  <th className="text-left px-4 py-3 font-medium">Recommended Cadence</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id} className="border-b border-border/50 hover:bg-paper transition-colors">
                    <td className="px-4 py-3 text-ink-900 font-medium">{row.org}</td>
                    {/* Not scored stays visibly not scored — never a number. */}
                    <td className="px-4 py-3">
                      {row.riskScore === null ? (
                        <span className="text-[11px] text-gray-400">Not scored</span>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${riskScoreBg(row.riskScore)}`}>
                          {row.riskScore}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{row.auditHistory ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(row.lastAudit)}</td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(row.nextScheduled)}</td>
                    <td className="px-4 py-3">
                      {row.recommendedCadence ? (
                        <span className={`badge ${CADENCE_COLORS[row.recommendedCadence]}`}>{row.recommendedCadence}</span>
                      ) : (
                        <span className="text-[11px] text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="bg-surface border border-border rounded-lg p-5">
        <h2 className="text-sm font-semibold text-ink-900 mb-3">Cadence Logic</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="badge badge-danger">Critical</span>
            <span className="text-gray-500">→ Quarterly</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-warning">High</span>
            <span className="text-gray-500">→ Half-Yearly</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-info">Medium</span>
            <span className="text-gray-500">→ Annual</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-success">Low</span>
            <span className="text-gray-500">→ Continuous Monitoring</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm ${color}`}>{icon}</div>
      <div>
        <div className="text-xl font-display font-semibold text-ink-900">{value ?? '—'}</div>
        <div className="text-[10px] text-gray-500">{label}</div>
      </div>
    </div>
  );
}
