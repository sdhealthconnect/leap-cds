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
      errorMessage: `Invalid request: ${prettifySchemaValidationErrors(
        hookRequestValidator.errors
      )}`
    };
  }
}

function prettifySchemaValidationErrors(givenErrors) {
  const errors = givenErrors || {};
  return errors.map(error => `${error.dataPath} ${error.message}`).join("; ");
}

module.exports = {
  hook
};
