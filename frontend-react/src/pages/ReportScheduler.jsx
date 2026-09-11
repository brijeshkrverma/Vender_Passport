import { useState } from 'react';

export default function ReportScheduler() {
  const [schedules, setSchedules] = useState([
    { id: 1, name: 'Weekly Compliance Summary', frequency: 'Weekly', format: 'PDF', recipients: 'compliance@globaltech.com', active: true },
    { id: 2, name: 'Monthly Risk Register', frequency: 'Monthly', format: 'Excel', recipients: 'risk@globaltech.com', active: true },
    { id: 3, name: 'Quarterly Vendor Scorecard', frequency: 'Quarterly', format: 'PDF', recipients: 'vendor.mgr@globaltech.com', active: false },
  ]);
  const [form, setForm] = useState({ name: '', frequency: 'Weekly', format: 'PDF', recipients: '', active: true });

  const addSchedule = (e) => {
    e.preventDefault();
    if (!form.name || !form.recipients) return;
    setSchedules([...schedules, { ...form, id: Date.now() }]);
    setForm({ name: '', frequency: 'Weekly', format: 'PDF', recipients: '', active: true });
  };

  const toggleActive = (id) => {
    setSchedules(schedules.map((s) => s.id === id ? { ...s, active: !s.active } : s));
  };

  const remove = (id) => setSchedules(schedules.filter((s) => s.id !== id));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Report Scheduler</h1>
        <p className="page-sub">Schedule recurring compliance and audit reports</p>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold mb-3">Create Schedule</h2>
        <form onSubmit={addSchedule} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="text-[11px] text-gray-500 font-medium block mb-1">Report Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Monthly Risk Report"
              className="w-full border border-border rounded px-3 py-2 text-xs outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 font-medium block mb-1">Frequency</label>
            <select
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
              className="w-full border border-border rounded px-3 py-2 text-xs outline-none focus:border-accent bg-white"
            >
              <option>Daily</option>
              <option>Weekly</option>
              <option>Monthly</option>
              <option>Quarterly</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] text-gray-500 font-medium block mb-1">Format</label>
            <select
              value={form.format}
              onChange={(e) => setForm({ ...form, format: e.target.value })}
              className="w-full border border-border rounded px-3 py-2 text-xs outline-none focus:border-accent bg-white"
            >
              <option>PDF</option>
              <option>Excel</option>
              <option>CSV</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] text-gray-500 font-medium block mb-1">Recipients</label>
            <input
              value={form.recipients}
              onChange={(e) => setForm({ ...form, recipients: e.target.value })}
              placeholder="email@company.com"
              className="w-full border border-border rounded px-3 py-2 text-xs outline-none focus:border-accent"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">Add Schedule</button>
        </form>
      </div>

      <div className="card overflow-hidden">
        {schedules.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            <p className="text-sm">No scheduled reports</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-paper/50 text-gray-500">
                <th className="text-left px-4 py-3 font-medium">Report</th>
                <th className="text-left px-4 py-3 font-medium">Frequency</th>
                <th className="text-left px-4 py-3 font-medium">Format</th>
                <th className="text-left px-4 py-3 font-medium">Recipients</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id} className="border-b border-border/50 hover:bg-paper">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-gray-500">{s.frequency}</td>
                  <td className="px-4 py-3 text-gray-500">{s.format}</td>
                  <td className="px-4 py-3 text-gray-500">{s.recipients}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(s.id)} className={`badge ${s.active ? 'badge-success' : 'badge-neutral'}`}>
                      {s.active ? 'Active' : 'Paused'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => remove(s.id)} className="text-danger text-[11px] font-semibold hover:underline">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
