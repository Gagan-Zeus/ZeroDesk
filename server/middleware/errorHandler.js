const errorHandler = (err, req, res, _next) => {
  console.error('Unhandled error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ message: `${field} already exists.` });
  }

  res.status(err.status || 500).json({
    message: err.message || 'Internal server error.',
  });
};

module.exports = errorHandler;
