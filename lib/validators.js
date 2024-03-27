const Ajv = require("ajv");

const ajv = new Ajv();

const consentDecisionHookRequestSchema = require("../schemas/patient-consent-consult-hook-request.schema.json");
const consentDecisionHookRequestValidator = ajv.compile(consentDecisionHookRequestSchema);

const xacmlRequestSchema = require("../schemas/xacml-request.schema.json");
const xacmlRequestValidator = ajv.compile(xacmlRequestSchema);

const slsRequestSchema = require("../schemas/sls-request.schema.json");
const slsRequestValidator = ajv.compile(slsRequestSchema);

function validateConsentDecisionHookRequest(req) {
  const body = req.body;
  if (!consentDecisionHookRequestValidator(body)) {
    const errorMessages = prettifySchemaValidationErrors(
      consentDecisionHookRequestValidator.errors
    );
    throw {
      httpCode: 400,
      error: "bad_request",
      errorMessage: `Invalid request: ${errorMessages}`
    };
  }
}

function validateXacmlRequest(req) {
  const body = req.body;
  if (!xacmlRequestValidator(body)) {
    const errorMessages = prettifySchemaValidationErrors(
      xacmlRequestValidator.errors
    );
    throw {
      httpCode: 400,
      error: "bad_request",
      errorMessage: `Invalid request: ${errorMessages}`
    };
  }
}

function validateSlsRequest(req) {
  const body = req.body;
  if (!slsRequestValidator(body)) {
    const errorMessages = prettifySchemaValidationErrors(
      slsRequestValidator.errors
    );
    throw {
      httpCode: 400,
      error: "bad_request",
      errorMessage: `Invalid request: ${errorMessages}`
    };
  }
}

function prettifySchemaValidationErrors(givenErrors) {
  const errors = givenErrors || [];
  return errors
    .map((error) => `${error.instancePath} ${error.message}`)
    .join("; ");
}

module.exports = {
  validateConsentDecisionHookRequest,
  validateXacmlRequest,
  validateSlsRequest
};
