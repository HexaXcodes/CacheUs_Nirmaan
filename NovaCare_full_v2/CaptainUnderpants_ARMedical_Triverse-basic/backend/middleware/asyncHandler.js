// middleware/asyncHandler.js
// Wraps async route handlers so errors auto-flow to the error middleware.
// Usage: router.get('/x', asyncHandler(async (req, res) => { ... }))
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
