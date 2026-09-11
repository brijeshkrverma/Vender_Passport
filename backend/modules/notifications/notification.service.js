const Notification = require('./notification.model');
const { NotFoundError } = require('../../shared/errors');

const clients = [];

class NotificationService {
  addClient(orgId, userId, res) {
    const client = { orgId, userId, res };
    clients.push(client);
    return () => {
      const idx = clients.indexOf(client);
      if (idx !== -1) clients.splice(idx, 1);
    };
  }

  publish(notification) {
    const data = `data: ${JSON.stringify(notification)}\n\n`;
    clients.forEach(c => {
      // Depending on the use case, you could also broadcast to all users in the org, 
      // but for now we'll target the specific user if userId matches, or all in org if broadcast.
      // Assuming typical notifications are targeted per userId.
      if (c.userId.toString() === notification.userId.toString()) {
        c.res.write(data);
      }
    });
  }

  async list(userId, query = {}) {
    const filter = { userId, deletedAt: null };
    if (query.unread !== undefined) filter.unread = query.unread === 'true' || query.unread === true;
    if (query.type) filter.type = query.type;
    return Notification.find(filter).sort({ createdAt: -1 });
  }

  async getById(id, userId) {
    const notification = await Notification.findOne({ _id: id, userId, deletedAt: null });
    if (!notification) throw new NotFoundError('Notification');
    return notification;
  }

  async create(data) {
    const notification = await Notification.create(data);
    this.publish(notification);
    return notification;
  }

  async markAsRead(id, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { unread: false },
      { new: true }
    );
    if (!notification) throw new NotFoundError('Notification');
    return notification;
  }

  async markAllRead(userId) {
    const result = await Notification.updateMany({ userId, unread: true }, { unread: false });
    return { modified: result.nModified || result.modifiedCount || 0 };
  }

  async getUnreadCount(userId) {
    return Notification.countDocuments({ userId, unread: true });
  }

  async delete(id, userId) {
    const notification = await Notification.softDelete({ _id: id, userId });
    if (!notification) throw new NotFoundError('Notification');
    return notification;
  }
}

module.exports = new NotificationService();
