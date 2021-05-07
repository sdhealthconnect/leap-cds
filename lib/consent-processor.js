const _ = require("lodash");
const logger = require("./logger");
const Obligations = require("./obligations");
const AuditService = require("./audit");

const {
  CONSENT_PERMIT,
  CONSENT_DENY,
  NO_CONSENT,
  flipConsentDecision
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

  const finalDecision = consentDecisions.reduce(mostRecentDecisionCombiner, {
    decision: NO_CONSENT,
    obligations: [],
    dateTime: "1970-01-01"
  });

  await AuditService.maybeRecordAudit(finalDecision, query);

  return finalDecision;
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
  const decision =
    thisDecision.decision === CONSENT_DENY
      ? { decision: CONSENT_DENY }
      : currentCandidate.decision === NO_CONSENT
      ? thisDecision
      : currentCandidate;

  const obligations =
    decision === CONSENT_DENY
      ? []
      : _.unionWith(
          thisDecision.obligations,
          currentCandidate.obligations,
          _.isEqual
        );
  return {
    ...decision,
    obligations
  };
}

async function consentDecision(entry, query) {
  const rules = _.get(entry, "resource.policyRule.coding") || [];
  const isOptIn = rules.some(rule => _.isEqual(rule, POLICY_RULE.OPTIN));
  const isOptOut = rules.some(rule => _.isEqual(rule, POLICY_RULE.OPTOUT));
  const baseDecision = isOptOut
    ? CONSENT_DENY
    : isOptIn
    ? CONSENT_PERMIT
    : NO_CONSENT;

  const innerProvisions = _.castArray(
    _.get(entry, "resource.provision.provision")
  ).filter(provision => provision);

  const provisionsDecisionPromises = innerProvisions.map(provision =>
    processProvision(provision, query, entry.fullUrl, baseDecision)
  );
  try {
    const provisionResults = await Promise.all(provisionsDecisionPromises);
    const matchedProvisions = provisionResults.filter(result => result.match);

    const decision = matchedProvisions.some(
      result => !result.obligations.length
    )
      ? flipConsentDecision(baseDecision)
      : baseDecision;

    const baseObligations = _.flatten(
      matchedProvisions.map(result => result.obligations)
    );
    const obligations =
      decision == CONSENT_PERMIT ? combineObligations(baseObligations) : [];

    const adjustedDecision = adjustDecision(query, decision, obligations);

    return {
      ...adjustedDecision,
      dateTime: entry.resource.dateTime,
      fullId: entry.fullUrl,
      id: `Consent/${entry.resource.id}`,
      patientId: entry.resource.patient
    };
  } catch (e) {
    logger.warn(`invalid consent: ${entry.fullUrl} ${e}`);

    return {
      decision: NO_CONSENT,
      obligations: [],
      dateTime: entry.resource.dateTime,
      id: entry.fullUrl
    };
  }
}

function adjustDecision(query, decision, obligations) {
  const requestedContentClasses = _.castArray(query.class);
  const redactedContentClass = Obligations.redactedContentClasses(obligations);

  return _.intersectionWith(
    requestedContentClasses,
    redactedContentClass,
    _.isEqual
  ).length
    ? {
        decision: CONSENT_DENY,
        obligations: []
      }
    : { decision, obligations };
}

function combineObligations(obligations) {
  const obligationsGroupedById = _.mapValues(
    _.groupBy(obligations, obligation => JSON.stringify(obligation.id)),
    bucket => bucket.map(item => item.parameters)
  );

  const rawCombinedObligations = _.mapValues(
    obligationsGroupedById,
    parameters => ({
      codes: parameters.reduce(
        (acc, thisOne) => _.union(acc, _.get(thisOne, "codes")),
        []
      ),
      exceptAnyOfCodes: parameters.reduce(
        (acc, thisOne) => _.union(acc, _.get(thisOne, "exceptAnyOfCodes")),
        []
      )
    })
  );

  const removeEmptyCodeProperties = obligation =>
    obligation.parameters.codes.length
      ? {
          id: obligation.id,
          parameters: { codes: obligation.parameters.codes }
        }
      : {
          id: obligation.id,
          parameters: {
            exceptAnyOfCodes: obligation.parameters.exceptAnyOfCodes
          }
        };

  const combinedObligations = Object.keys(rawCombinedObligations)
    .map(key => ({
      id: JSON.parse(key),
      parameters: _.get(rawCombinedObligations, key)
    }))
    .map(removeEmptyCodeProperties);

  return combinedObligations;
}

module.exports = {
  processDecision
};
