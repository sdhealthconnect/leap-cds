const logger = require("../lib/logger");

function error(err, req, res, next) {
  httpCode = err.httpCode || 500;

  if (httpCode >= 500) {
    logger.warn(err);
  }
  res.status(httpCode).send(err);
}

module.exports = {
  error
};
