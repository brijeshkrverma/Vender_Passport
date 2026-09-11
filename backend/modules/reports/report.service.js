const ReportService = {
  async getSummary(orgId, models) {
    const { Audit, Finding, Certificate, Risk } = models;
    const scope = orgId ? { orgId } : {};
    const [activeAudits, openFindings, expiringCerts, highRisks] = await Promise.all([
      Audit.countDocuments({ ...scope, status: { $ne: 'Closed' } }),
      Finding.countDocuments({ ...scope, status: { $in: ['Open','In Progress','Overdue'] } }),
      Certificate.countDocuments({ ...scope, expiry: { $lte: new Date(Date.now() + 30 * 86400000), $gte: new Date() } }),
      Risk.countDocuments({ ...scope, residual: 'High' }),
    ]);
    return { activeAudits, openFindings, expiringCerts, highRisks };
  },

  getExportHeaders(type) {
    const headers = {
      audits: 'ID,Title,Type,Organization,Framework,Status,Due Date\n',
      findings: 'ID,Title,Severity,Status,Audit,Assigned To,Due Date\n',
      risks: 'ID,Title,Category,Inherent,Residual,Status,Owner\n',
      certificates: 'ID,Name,Type,Issuer,Expiry,Status,Organization\n',
    };
    return headers[type] || null;
  },
};

module.exports = ReportService;
