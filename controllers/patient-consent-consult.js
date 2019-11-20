const { hookRequestValidator } = require("../lib/validators");
const { NO_CONSENT_CARD } = require("../lib/cards");

function hook(req, res) {
  validateRequest(req);
  res.send({
    cards: [NO_CONSENT_CARD]
  });
}

function validateRequest(req) {
  const body = req.body;
  if (!hookRequestValidator(body)) {
    const errorMessages = prettifySchemaValidationErrors(
      hookRequestValidator.errors
    );
    throw {
      httpCode: 400,
      error: "bad_request",
      errorMessage: `Invalid request: ${errorMessages}`
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
