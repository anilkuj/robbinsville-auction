const path = require('path');

module.exports = {
  admin: {
    username: 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    role: 'admin',
  },
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  port: parseInt(process.env.PORT || '3001', 10),
  dataDir: path.join(__dirname, 'data'),
  stateFile: path.join(__dirname, 'data', 'state.json'),
  clientDist: path.join(__dirname, '..', 'client', 'dist'),
};
