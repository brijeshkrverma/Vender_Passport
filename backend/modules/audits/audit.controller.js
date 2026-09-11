const service = require('./audit.service');
const response = require('../../shared/response');
const { parsePagination } = require('../../shared/pagination');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { items, total } = await service.list(req.user.scopeOrgId, req.query, { skip, limit });
    response.paginated(res, items, { page, limit, total });
  } catch(e) { next(e); }
};
exports.getById = async(req,res,next)=>{try{response.success(res,await service.getById(req.params.id,req.user.scopeOrgId))}catch(e){next(e)}};
exports.create = async(req,res,next)=>{try{response.created(res,await service.create(req.body,req.user.scopeOrgId))}catch(e){next(e)}};
exports.update = async(req,res,next)=>{try{response.success(res,await service.update(req.params.id,req.body,req.user.scopeOrgId))}catch(e){next(e)}};
exports.delete = async(req,res,next)=>{try{await service.delete(req.params.id,req.user.scopeOrgId);response.noContent(res)}catch(e){next(e)}};
exports.advanceStage = async(req,res,next)=>{try{response.success(res,await service.advanceStage(req.params.id,req.user.scopeOrgId))}catch(e){next(e)}};
exports.retreatStage = async(req,res,next)=>{try{response.success(res,await service.retreatStage(req.params.id,req.user.scopeOrgId))}catch(e){next(e)}};
exports.assignAuditor = async(req,res,next)=>{try{response.success(res,await service.assignAuditor(req.params.id,req.body.auditor,req.user.scopeOrgId,req.user))}catch(e){next(e)}};
exports.unassignAuditor = async(req,res,next)=>{try{response.success(res,await service.unassignAuditor(req.params.id,req.body.auditor,req.user.scopeOrgId))}catch(e){next(e)}};
exports.getStats = async(req,res,next)=>{try{response.success(res,await service.getStats(req.user.scopeOrgId))}catch(e){next(e)}};
exports.assignableAuditors = async(req,res,next)=>{try{response.success(res,await service.listAssignableAuditors(req.user.scopeOrgId || req.user.orgId))}catch(e){next(e)}};
