const service = require('./notification.service');
const response = require('../../shared/response');
const { parsePagination } = require('../../shared/pagination');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const items = await service.list(req.user.userId, req.query);
    response.paginated(res, items.slice(skip, skip + limit), { page, limit, total: items.length });
  } catch (e) { next(e); }
};

exports.stream = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const removeClient = service.addClient(req.user.orgId, req.user.userId, res);
  req.on('close', () => removeClient());
};

exports.getById = async (req, res, next) => {
  try { response.success(res, await service.getById(req.params.id, req.user.userId)); } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try { response.created(res, await service.create({ ...req.body, userId: req.user.userId, orgId: req.user.orgId })); } catch (e) { next(e); }
};

exports.markAsRead = async (req, res, next) => {
  try { response.success(res, await service.markAsRead(req.params.id, req.user.userId)); } catch (e) { next(e); }
};

exports.markAllRead = async (req, res, next) => {
  try { response.success(res, await service.markAllRead(req.user.userId)); } catch (e) { next(e); }
};

exports.getUnreadCount = async (req, res, next) => {
  try { response.success(res, { count: await service.getUnreadCount(req.user.userId) }); } catch (e) { next(e); }
};

exports.delete = async (req, res, next) => {
  try { await service.delete(req.params.id, req.user.userId); response.noContent(res); } catch (e) { next(e); }
};
