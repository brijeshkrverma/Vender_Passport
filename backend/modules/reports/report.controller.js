const service = require('./report.service');
const response = require('../../shared/response');

exports.summary = async (req, res, next) => {
  try {
    const models = {
      Audit: require('mongoose').models.Audit,
      Finding: require('mongoose').models.Finding,
      Certificate: require('mongoose').models.Certificate,
      Risk: require('mongoose').models.Risk,
    };
    const data = await service.getSummary(req.user.scopeOrgId, models);
    response.success(res, data);
  } catch (e) { next(e); }
};

exports.exportCsv = async (req, res, next) => {
  try {
    const headers = service.getExportHeaders(req.params.type);
    if (!headers) return res.status(400).json({ error: 'Export type not supported' });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.type}-export.csv"`);
    res.send(headers);
  } catch (e) { next(e); }
};
