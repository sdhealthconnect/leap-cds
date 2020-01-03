const _ = require("lodash");

const {
  CONSENT_PERMIT,
  CONSENT_DENY,
  NO_CONSENT
} = require("./consent-decisions");

const { processProvision } = require("./consent-provisions");

const { POLICY_RULE, CONSENT_SCOPE_SYSTEM } = require("./consent-valuesets");

async function processDecision(consentsBundle, query) {
  const consentDecisionPromises = consentsBundle
    .filter(isActive)
    .filter(isValid)
    .filter(entry => matchesScope(entry, query))
    .map(entry => consentDecision(entry, query));

  const consentDecisions = await Promise.all(consentDecisionPromises);

  return consentDecisions.reduce(mostRecentDecisionCombiner, {
    decision: NO_CONSENT,
    dateTime: "1970-01-01"
  });
}

const isActive = entry => entry.resource.status === "active";

function isValid(entry) {
  const periodStart = _.get(entry, "resource.provision.period.start");
  const periodEnd = _.get(entry, "resource.provision.period.end");

  return (
    (!periodStart || Date.now() >= new Date(periodStart).valueOf()) &&
    (!periodEnd || Date.now() <= new Date(periodEnd).valueOf())
  );
}

function matchesScope(entry, query) {
  const scopes = _.get(entry, "resource.scope.coding") || [];
  return scopes.some(scope =>
    _.isEqual(scope, { system: CONSENT_SCOPE_SYSTEM, code: query.scope })
  );
}

function mostRecentDecisionCombiner(currentCandidate, thisConsentDecision) {
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

function denyOverrideDecisionCombiner(currentCandidate, thisDecision) {
  return thisDecision === CONSENT_DENY
    ? CONSENT_DENY
    : currentCandidate === NO_CONSENT
    ? thisDecision
    : currentCandidate;
}

async function consentDecision(entry, query) {
  const rules = _.get(entry, "resource.policyRule.coding") || [];
  const isOptIn = rules.some(rule => _.isEqual(rule, POLICY_RULE.OPTIN));
  const isOptOut = rules.some(rule => _.isEqual(rule, POLICY_RULE.OPTOUT));
  const decision = isOptOut
    ? CONSENT_DENY
    : isOptIn
    ? CONSENT_PERMIT
    : NO_CONSENT;

  const provisionsDecision = await processProvision(
    entry.resource.provision,
    query,
    entry.fullUrl
  );

  const finalDecision = denyOverrideDecisionCombiner(
    decision,
    provisionsDecision
  );

  return {
    decision: finalDecision,
    dateTime: entry.resource.dateTime,
    id: entry.fullUrl
  };
}

module.exports = {
  processDecision
};
