require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3004,
  ACCESS_PIN: process.env.ACCESS_PIN || '1234',
  DATA_DIR: require('path').join(__dirname, 'data'),
  VIDEOS_DIR: require('path').join(__dirname, 'data', 'videos'),
};
