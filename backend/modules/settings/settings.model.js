const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  orgId: { type: String, required: true, unique: true, index: true },
  orgName: { type: String, default: '' },
  industry: { type: String, default: '' },
  contactEmail: { type: String, default: '' },
  notifications: {
    emailNotifications: { type: Boolean, default: true },
    auditReminders: { type: Boolean, default: true },
    certExpiryAlerts: { type: Boolean, default: true },
  },
  security: {
    twoFactor: { type: Boolean, default: false },
    sessionTimeout: { type: Boolean, default: true },
    auditLog: { type: Boolean, default: true },
  },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
