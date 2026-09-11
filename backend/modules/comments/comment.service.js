const Comment = require('./comment.model');
const User = require('../auth/auth.model');
const { NotFoundError, ForbiddenError } = require('../../shared/errors');
const { orgFilter, byIdQuery } = require('../../shared/scope');

class CommentService {
  async listByFinding(findingId, orgId) {
    return Comment.find({ findingId, ...orgFilter(orgId) }).sort({ createdAt: 1 });
  }

  async create(data, user, orgId) {
    let author = user.orgName || user.userId;
    try {
      const dbUser = await User.findById(user.userId).select('name orgName');
      if (dbUser) author = dbUser.name || dbUser.orgName || author;
    } catch (e) { /* fall back to token claims */ }
    return Comment.create({
      findingId: data.findingId,
      authorId: user.userId,
      author,
      body: data.body,
      ...orgFilter(orgId),
    });
  }

  async delete(id, userId, orgId) {
    const comment = await Comment.findOne(byIdQuery(orgId, id));
    if (!comment) throw new NotFoundError('Comment');
    if (comment.authorId && comment.authorId !== userId) {
      throw new ForbiddenError('You can only delete your own comments');
    }
    await Comment.softDelete({ _id: comment._id }, { userId });
    return { deleted: true };
  }
}

module.exports = new CommentService();
