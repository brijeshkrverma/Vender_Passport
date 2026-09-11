const authService = require('./auth.service');
const response = require('../../shared/response');

exports.register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    response.created(res, result);
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    response.success(res, result);
  } catch (err) { next(err); }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return response.forbidden(res, 'Refresh token required');
    const result = await authService.refreshAccessToken(refreshToken);
    response.success(res, result);
  } catch (err) { next(err); }
};

exports.logout = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    await authService.logout(req.user.userId, token);
    response.success(res, { message: 'Logged out successfully' });
  } catch (err) { next(err); }
};

exports.me = async (req, res, next) => {
  try {
    response.success(res, req.user);
  } catch (err) { next(err); }
};

exports.changePassword = async (req, res, next) => {
  try {
    const result = await authService.changePassword(req.user.userId, req.body.oldPassword, req.body.newPassword);
    response.success(res, result);
  } catch (err) { next(err); }
};
