const _ = require("lodash");

const {
  CONSENT_PERMIT,
  CONSENT_DENY,
  NO_CONSENT
} = require("./consent-decisions");

const { POLICY_RULE, CONSENT_SCOPE_SYSTEM } = require("./consent-valuesets");

function processDecision(consents, query) {
  return consents
    .filter(isActive)
    .filter(consent => matchesScope(consent, query))
    .map(consentDecision)
    .reduce(decisionCombiner, { decision: NO_CONSENT, dateTime: "1970-01-01" });
}

const isActive = consent => consent.status === "active";

function matchesScope(consent, query) {
  const scopes = _.get(consent, "scope.coding") || [];
  return scopes.some(scope =>
    _.isEqual(scope, { system: CONSENT_SCOPE_SYSTEM, code: query.scope })
  );
}

function decisionCombiner(currentCandidate, thisConsentDecision) {
  const thisConsentIsNotApplicable = _.isEqual(
    thisConsentDecision.decision,
    NO_CONSENT
  );
  const thisConsentIsLessRecent =
    new Date(thisConsentDecision.dateTime) <
    new Date(currentCandidate.dateTime);
  return thisConsentIsNotApplicable
    ? currentCandidate
    : thisConsentIsLessRecent
    ? currentCandidate
    : thisConsentDecision;
}

function consentDecision(consent) {
  const rules = _.get(consent, "policyRule.coding") || [];
  const isOptIn = rules.some(rule => _.isEqual(rule, POLICY_RULE.OPTIN));
  const isOptOut = rules.some(rule => _.isEqual(rule, POLICY_RULE.OPTOUT));
  const decision = isOptOut
    ? CONSENT_DENY
    : isOptIn
    ? CONSENT_PERMIT
    : NO_CONSENT;
  return { decision, dateTime: consent.dateTime, id: consent.id };
}

module.exports = {
  processDecision
};
