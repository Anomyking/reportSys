// middleware/adminMiddleware.js
const { UnauthenticatedError } = require('../errors'); // Or your custom error

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    throw new UnauthenticatedError('Not authorized to access this route');
  }
  next();
};

module.exports = adminMiddleware;