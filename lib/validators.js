const Ajv = require("ajv");

const ajv = new Ajv();

const hookRequestSchema = require("../schemas/patient-consent-consult-hook-request.schema.json");
const hookRequestValidator = ajv.compile(hookRequestSchema);

module.exports = {
  hookRequestValidator
};
