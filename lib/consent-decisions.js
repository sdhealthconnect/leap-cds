const CONSENT_PERMIT = "CONSENT_PERMIT";
const CONSENT_DENY = "CONSENT_DENY";
const NO_CONSENT = "NO_CONSENT";

function flipConsentDecision(decision) {
  return decision === CONSENT_PERMIT
    ? CONSENT_DENY
    : decision === CONSENT_DENY
    ? CONSENT_PERMIT
    : NO_CONSENT;
}

module.exports = {
  CONSENT_PERMIT,
  CONSENT_DENY,
  NO_CONSENT,
  flipConsentDecision
};
