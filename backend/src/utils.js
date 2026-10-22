class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
// Express 4 não captura rejeições de handlers async: este wrapper encaminha ao errorHandler.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { HttpError, wrap };
