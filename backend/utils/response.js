// Centralized JSON envelope and HTTP error response handlers
export function success(res, data = null, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}

export function fail(res, message = 'An error occurred', statusCode = 400, errors = null) {
  const payload = {
    success: false,
    message
  };
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
}

export function handleRouteError(res, err, context = 'Operation failed') {
  console.error(`[Error] ${context}:`, err.message || err);
  const status = err.statusCode || err.status || 500;
  return res.status(status).json({
    success: false,
    message: err.message || context,
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}
