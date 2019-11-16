const { hookRequestValidator } = require("../lib/validators");

function hook(req, res) {
  validateRequest(req);
  res.send({});
}

function validateRequest(req) {
  const body = req.body;
  if (!hookRequestValidator(body)) {
    throw {
      httpCode: 400,
      error: "bad_request",
      errorMessage: `Invalid request: ${hookRequestValidator.errors}`
    };
  }
}

module.exports = {
  hook
};
