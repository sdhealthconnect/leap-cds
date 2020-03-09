const { hookRequestValidator } = require("../lib/validators");
const { asCard } = require("../lib/consent-decision-card");
const { processDecision } = require("../lib/consent-processor");
const { fetchConsents } = require("../lib/consent-discovery");
const logger = require("../lib/logger");

async function hook(req, res, next) {
  try {
    validateRequest(req);

    const patientIds = req.body.context.patientId;
    const scope = req.body.context.scope;

    const consentsBundle = await fetchConsents(patientIds, scope);
    const decisionEntry = await processDecision(
      consentsBundle,
      req.body.context
    );

    logger.debug(
      `Request: ${req.body.hookInstance}, Consents: ${consentsBundle.map(
        consent => consent.fullUrl
      )}, Decision: ${JSON.stringify(decisionEntry)}`
    );

    res.send({
      cards: [asCard(decisionEntry)]
    });
  } catch (e) {
    next(e);
  }
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
