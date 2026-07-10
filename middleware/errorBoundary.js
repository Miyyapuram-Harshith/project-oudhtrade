export function errorHandler(err, req, res, next) {
  console.error(`[CORE GATEWAY EXCEPTION] ${new Date().toISOString()}`, err.stack || err);
  
  const isProd = process.env.NODE_ENV === 'production';
  
  res.status(err.status || 500).json({
    error: 'Server Error',
    message: isProd ? 'An unexpected internal error occurred.' : (err.message || 'An unexpected internal error occurred.')
  });
}
