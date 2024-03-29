const _ = require("lodash");
const { codesIntersection, codesUnion } = require("./codes");
const logger = require("./logger");
const Obligations = require("./obligations");
const AuditService = require("./audit");

const {
  CONSENT_PERMIT,
  CONSENT_DENY,
  NO_CONSENT,
  flipConsentDecision
} = require("./consent-decisions");

const { processProvision, matchPurposeOfUse } = require("./consent-provisions");

async function processDecision(consentsBundle, query) {
  const consentDecisionPromises = consentsBundle
    .filter(isActive)
    .filter(isValid)
    .filter((entry) => matchesCategory(entry, query))
    .filter((entry) => matchPurposeOfUse(entry?.resource?.provision, query))
    .map((entry) => consentDecision(entry, query));

  const consentDecisions = await Promise.all(consentDecisionPromises);

  const applicableConsentDecisions = consentDecisions.filter(
    (aDecision) => aDecision?.decision !== NO_CONSENT
  );

  const finalDecision = applicableConsentDecisions.reduce(
    mostRecentDecisionCombiner,
    {
      decision: NO_CONSENT,
      obligations: [],
      dateTime: "1970-01-01"
    }
  );

  await AuditService.maybeRecordAudit(finalDecision, query);

  return finalDecision;
}

const isActive = (entry) => entry.resource.status === "active";

function isValid(entry) {
  const periodStart = entry?.resource?.provision?.period?.start;
  const periodEnd = entry?.resource?.provision?.period?.end;

  return (
    (!periodStart || Date.now() >= new Date(periodStart).valueOf()) &&
    (!periodEnd || Date.now() <= new Date(periodEnd).valueOf())
  );
}

function matchesCategory(entry, query) {
  const untrimmedCategories = entry?.resource?.category || [];
  const untrimmedQueriedCategories = query.category || [];
  const categories = untrimmedCategories
    .map((categoryCode) => categoryCode?.coding)
    .flat()
    .map(({ system, code }) => ({ system, code }))
    .filter((category) => category);

  const queriedCategories = untrimmedQueriedCategories.map(
    ({ system, code }) => ({ system, code })
  );

  return (
    !query.category || codesIntersection(queriedCategories, categories).length
  );
}

function mostRecentDecisionCombiner(currentCandidate, thisConsentDecision) {
  const thisConsentIsLessRecent =
    new Date(thisConsentDecision.dateTime) <
    new Date(currentCandidate.dateTime);

  return thisConsentIsLessRecent ? currentCandidate : thisConsentDecision;
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
      : codesUnion(thisDecision.obligations, currentCandidate.obligations);
  return {
    ...decision,
    obligations
  };
}

async function consentDecision(entry, query) {
  const defaultDecision = entry?.resource?.provision?.type;
  const baseDecision =
    defaultDecision === "deny"
      ? CONSENT_DENY
      : defaultDecision === "permit"
        ? CONSENT_PERMIT
        : NO_CONSENT;

  const innerProvisions = (
    entry?.resource?.provision?.provision
      ? [entry.resource.provision.provision].flat()
      : []
  ).filter((provision) => provision);

  const provisionsDecisionPromises = innerProvisions.map((provision) =>
    processProvision(provision, query, entry.fullUrl, baseDecision)
  );

  try {
    const provisionResults = await Promise.all(provisionsDecisionPromises);
    const matchedProvisions = provisionResults.filter(({ match }) => match);

    const decision = matchedProvisions.some(
      ({ obligations }) => !obligations.length
    )
      ? flipConsentDecision(baseDecision)
      : baseDecision;

    const baseObligations = matchedProvisions
      .map(({ obligations }) => obligations)
      .flat();
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
    console.log(e);
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
  const requestedContentClasses = query?.class ? [query.class].flat() : [];
  const redactedContentClass = Obligations.redactedContentClasses(obligations);

  return codesIntersection(requestedContentClasses, redactedContentClass).length
    ? {
        decision: CONSENT_DENY,
        obligations: []
      }
    : { decision, obligations };
}

function combineObligations(obligations) {
  const obligationsGroupedById = _.mapValues(
    _.groupBy(obligations, (obligation) => JSON.stringify(obligation.id)),
    (bucket) => bucket.map(({ parameters }) => parameters)
  );

  const rawCombinedObligations = _.mapValues(
    obligationsGroupedById,
    (parameters) => ({
      codes: parameters.reduce(
        (acc, thisOne) => _.union(acc, thisOne?.codes),
        []
      ),
      exceptAnyOfCodes: parameters.reduce(
        (acc, thisOne) => _.union(acc, thisOne?.exceptAnyOfCodes),
        []
      )
    })
  );

  const combinedObligations = Object.keys(rawCombinedObligations)
    .map((key) => ({
      id: JSON.parse(key),
      parameters: rawCombinedObligations?.[key]
    }))
    .map(removeEmptyCodeProperties);

  return combinedObligations;
}

const removeEmptyCodeProperties = (obligation) =>
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

module.exports = {
  processDecision
};
