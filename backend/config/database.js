const mongoose = require('mongoose');
const logger = require('../shared/logger');

async function connectDB(uri) {
  mongoose.connection.on('connected', () => logger.info('Mongoose connected'));
  mongoose.connection.on('error', (err) => logger.error('Mongoose error', { error: err.message }));
  mongoose.connection.on('disconnected', () => logger.warn('Mongoose disconnected'));

  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
