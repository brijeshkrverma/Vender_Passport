const Settings = require('./settings.model');

class SettingsService {
  async getByOrgId(orgId) {
    return Settings.findOne({ orgId });
  }

  async upsert(orgId, data) {
    return Settings.findOneAndUpdate(
      { orgId },
      { $set: data },
      { upsert: true, new: true, runValidators: true }
    );
  }
}

module.exports = new SettingsService();
