// Test-mode server entry for Playwright — disables rate limiting and demo-mode
// confusion so the E2E suite is not throttled or polluted.
process.env.NODE_ENV = 'test';
process.env.RATE_LIMIT_ENABLED = '0';
require('../server.js');
