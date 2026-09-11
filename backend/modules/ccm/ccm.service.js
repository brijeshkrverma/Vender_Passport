const CCMService = {
  getDashboardMetrics() {
    return [
      { control: 'Privileged Access Management', metric: 'MFA Enforcement Rate', current: 98.5, target: 100, status: 'Healthy', lastChecked: new Date().toISOString() },
      { control: 'Access Recertification', metric: 'Completion Rate', current: 87, target: 100, status: 'At Risk', lastChecked: new Date().toISOString() },
      { control: 'Dual Payment Approval', metric: 'Coverage', current: 94, target: 100, status: 'Warning', lastChecked: new Date().toISOString() },
    ];
  },

  getAlerts() {
    return [];
  },
};

module.exports = CCMService;
