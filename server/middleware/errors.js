export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function errorHandler(error, req, res, _next) {
  if (res.headersSent) return;
  let status = error instanceof AppError ? error.status : 500;
  let code = error instanceof AppError ? error.code : 'INTERNAL_ERROR';
  let message = error instanceof AppError ? error.message : 'Something went wrong. Please try again.';
  if (error.type === 'entity.too.large') {
    status = 413; code = 'PAYLOAD_TOO_LARGE'; message = 'That request is too large. Paste a shorter passage.';
  } else if (error.type === 'entity.parse.failed') {
    status = 400; code = 'INVALID_JSON'; message = 'Send a valid JSON request.';
  }
  // Do not log request text, raw provider errors, or credentials.
  if (status >= 500) console.error(JSON.stringify({ requestId: req.requestId, code, status }));
  res.status(status).json({ error: { code, message, requestId: req.requestId } });
}
