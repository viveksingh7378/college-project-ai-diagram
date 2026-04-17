export const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.message}`);
  const status = err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
