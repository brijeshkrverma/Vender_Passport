import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const MOCK_EVENTS = [
  { day: 3, title: 'SOC 2 Audit Due', type: 'audit' },
  { day: 5, title: 'ISO 27001 Expiring', type: 'cert' },
  { day: 7, title: 'Critical Finding #142 Due', type: 'finding' },
  { day: 12, title: 'PCI DSS Assessment', type: 'audit' },
  { day: 15, title: 'GDPR Cert Expiring', type: 'cert' },
  { day: 18, title: 'High Finding #89 Due', type: 'finding' },
  { day: 22, title: 'Internal Audit Q3', type: 'audit' },
  { day: 28, title: 'SSL Certificate Renewal', type: 'cert' },
];

const TYPE_COLORS = {
  audit: { dot: 'bg-info' },
  cert: { dot: 'bg-seal' },
  finding: { dot: 'bg-danger' },
};

const TYPE_LABELS = { audit: 'Audit', cert: 'Certificate', finding: 'Finding' };

export default function Calendar() {
  const { authHeaders } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [popover, setPopover] = useState(null);
  const [events, setEvents] = useState(MOCK_EVENTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const fetchers = [
      fetch('/api/audits', { headers: authHeaders }).then(r => r.ok ? r.json() : Promise.reject()).catch(() => null),
      fetch('/api/certificates/expiring?days=90', { headers: authHeaders }).then(r => r.ok ? r.json() : Promise.reject()).catch(() => null),
      fetch('/api/findings', { headers: authHeaders }).then(r => r.ok ? r.json() : Promise.reject()).catch(() => null),
    ];
    Promise.all(fetchers)
      .then(([auditsRes, certsRes, findingsRes]) => {
        if (cancelled) return;
        const built = [];
        const audits = (auditsRes && (auditsRes.data || auditsRes)) || [];
        const certs = (certsRes && (certsRes.data || certsRes)) || [];
        const findings = (findingsRes && (findingsRes.data || findingsRes)) || [];
        if (Array.isArray(audits)) {
          audits.forEach(a => {
            const d = a.dueDate || a.plannedEndDate || a.scheduledDate;
            if (d) built.push({ day: new Date(d).getDate(), title: a.title || a.name || 'Audit due', type: 'audit' });
          });
        }
        if (Array.isArray(certs)) {
          certs.forEach(c => {
            const d = c.expiryDate || c.expirationDate || c.validUntil;
            if (d) built.push({ day: new Date(d).getDate(), title: c.name || c.title || 'Certificate expiring', type: 'cert' });
          });
        }
        if (Array.isArray(findings)) {
          findings.forEach(f => {
            const d = f.dueDate || f.targetDate || f.remediationDate;
            if (d) built.push({ day: new Date(d).getDate(), title: f.title || f.description || 'Finding due', type: 'finding' });
          });
        }
        if (built.length > 0) setEvents(built);
        else { setEvents([]); setError(true); }
      })
      .catch(() => { if (!cancelled) { setError(true); setEvents([]); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [authHeaders]);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const eventsByDay = {};
  events.forEach(e => {
    if (!eventsByDay[e.day]) eventsByDay[e.day] = [];
    eventsByDay[e.day].push(e);
  });

  const handleDayClick = (day, e) => {
    const dayEvents = eventsByDay[day];
    if (!dayEvents || dayEvents.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover({ day, events: dayEvents, x: rect.left, y: rect.bottom + 4 });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-display font-semibold text-ink-900">Compliance Calendar</h1>
        <p className="text-sm text-gray-500">Monthly view of audits, certificates, and findings</p>
      </div>

      {error && events === MOCK_EVENTS && (
        <div className="px-4 py-2 bg-warning-bg/20 border border-warning/20 rounded text-[11px] text-warning font-medium">
          Could not load live data from the server — nothing is shown rather than something inaccurate.
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-sm text-gray-400">Loading...</div>
      ) : (

      <div className="bg-surface border border-border rounded-lg overflow-hidden max-w-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <button onClick={prevMonth} className="text-xs text-gray-500 hover:text-ink-900 px-3 py-1.5 rounded-full border border-border hover:bg-paper transition-colors">
            &larr; Prev
          </button>
          <span className="text-sm font-semibold text-ink-900">
            {MONTHS[currentMonth]} {currentYear}
          </span>
          <button onClick={nextMonth} className="text-xs text-gray-500 hover:text-ink-900 px-3 py-1.5 rounded-full border border-border hover:bg-paper transition-colors">
            Next &rarr;
          </button>
        </div>

        <div className="grid grid-cols-7">
          {WEEKDAYS.map(w => (
            <div key={w} className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center py-2 border-b border-border bg-paper/30">
              {w}
            </div>
          ))}

          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`e-${idx}`} className="h-16 border-b border-r border-border/50 bg-paper/20" />;
            }
            const dayEvents = eventsByDay[day] || [];
            return (
              <div
                key={day}
                onClick={(e) => handleDayClick(day, e)}
                className="h-16 border-b border-r border-border/50 p-1 cursor-pointer transition-colors hover:bg-paper/50"
              >
                <span className="text-xs text-ink-900 font-medium">{day}</span>
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  {dayEvents.map((ev, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${TYPE_COLORS[ev.type].dot}`}
                      title={ev.title}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-info" /> <span className="text-gray-500">Audit</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-seal" /> <span className="text-gray-500">Certificate</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-danger" /> <span className="text-gray-500">Finding</span></div>
      </div>

      {popover && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPopover(null)} />
          <div
            className="fixed z-50 bg-surface border border-border rounded-lg shadow-lg p-3 min-w-[200px] animate-slide-up"
            style={{ left: popover.x, top: popover.y }}
          >
            <div className="text-xs text-gray-400 mb-2">
              {MONTHS[currentMonth]} {popover.day}
            </div>
            {popover.events.map((ev, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 text-xs">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${TYPE_COLORS[ev.type].dot}`} />
                <span className="text-ink-900">{ev.title}</span>
                <span className={`text-[10px] font-medium ${
                  ev.type === 'audit' ? 'text-info' : ev.type === 'cert' ? 'text-seal-dark' : 'text-danger'
                }`}>{TYPE_LABELS[ev.type]}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
