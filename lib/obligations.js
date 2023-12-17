const { codeEquals } = require("./codes");
const CONSENT_VALUESETS = require("./consent-valuesets");

const redactObligations = (obligations) =>
  obligations.filter((obligation) =>
    codeEquals(obligation.id, CONSENT_VALUESETS.REDACT_CODE)
  );

function redactedContentClasses(obligations) {
  return redactObligations(obligations)
    .map((obligation) => obligation.parameters.codes)
    .flat()
    .filter((code) =>
      CONSENT_VALUESETS.CONTENT_CLASS_SYSTEMS.includes(code.system)
    );
}
module.exports = {
  redactedContentClasses
};
