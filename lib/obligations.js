const _ = require("lodash");
const CONSENT_VALUESETS = require("./consent-valuesets");

function redactObligations(obligations) {
  return obligations.filter(obligation =>
    _.isEqual(obligation.id, CONSENT_VALUESETS.REDACT_CODE)
  );
}

function redactedContentClasses(obligations) {
  return _.flatten(
    redactObligations(obligations).map(
      obligation => obligation.parameters.codes
    )
  ).filter(code =>
    CONSENT_VALUESETS.CONTENT_CLASS_SYSTEMS.includes(code.system)
  );
}
module.exports = {
  redactedContentClasses
};
