const { codesIntersection } = require("./codes");
const { identifiersIntersection } = require("./identifiers");

const superagent = require("superagent");
const { maybeAddAuth } = require("../lib/auth");

const {
  PURPOSE_OF_USE_SYSTEM,
  CONSENT_OBLIGATIONS
} = require("./consent-valuesets");

const { CONSENT_PERMIT, CONSENT_DENY } = require("./consent-decisions");

function matchPurposeOfUse(provision, query) {
  const untrimmedPurposes = provision?.purpose
    ? [provision?.purpose].flat()
    : [];
  const untrimmedQueriedPurposes = query?.purposeOfUse
    ? [query.purposeOfUse].flat()
    : [];

  const purposes = untrimmedPurposes
    .map(({ system, code }) => ({ system, code }))
    .filter((purpose) => purpose);

  const queriedPurposes = untrimmedQueriedPurposes.map((purpose) => ({
    system: PURPOSE_OF_USE_SYSTEM,
    code: purpose
  }));

  return (
    !query.purposeOfUse ||
    !provision?.purpose ||
    codesIntersection(queriedPurposes, purposes).length
  );
}

async function fetchActor(actorReference, fhirBase) {
  return maybeAddAuth(
    superagent
      .get(`${fhirBase}${actorReference}`)
      .set({ Accept: "application/json" })
  );
}

async function matchActor(provision, query, fhirServerBase) {
  const provisionActors = provision.actor || [];
  const actorReferencesPromises = provisionActors
    .map(({ reference }) => reference?.reference)
    .map((actorReference) => fetchActor(actorReference, fhirServerBase));

  const actorResources = await Promise.all(actorReferencesPromises);

  const allActorIdentifiers = actorResources
    .map(({ body }) => body.identifier)
    .flat();

  const queryActorIds = query.actor;

  const matchingIdentifiers = identifiersIntersection(
    allActorIdentifiers,
    queryActorIds
  );

  return !provision.actor || matchingIdentifiers.length > 0;
}

function matchClass(provision, query) {
  const untrimmedProvisionClasses = provision.class || [];
  const untrimmedQueryClasses = query.class || [];

  const provisionClasses = untrimmedProvisionClasses.map(
    ({ system, code }) => ({ system, code })
  );
  const queryClasses = untrimmedQueryClasses.map(({ system, code }) => ({
    system,
    code
  }));

  const matchingClasses = codesIntersection(provisionClasses, queryClasses);

  return !provision.class || !query.class || matchingClasses.length > 0;
}

async function processProvision(
  provision,
  query,
  fullUrl,
  overarchingDecision
) {
  if (!provision) {
    return {
      match: false,
      obligations: []
    };
  }

  const matchedActor = await matchActor(
    provision,
    query,
    fhirBaseFromConsentUrl(fullUrl)
  );

  const matchedClass = matchClass(provision, query);

  const match =
    matchPurposeOfUse(provision, query) && matchedActor && matchedClass;

  const obligations = match
    ? determineObligations(query, overarchingDecision, provision)
    : [];

  return {
    match,
    obligations
  };
}

function determineObligations(query, decision, provision) {
  const contentClasses = provision?.class ? [provision.class].flat() : [];
  const securityLabels = provision?.securityLabel
    ? [provision.securityLabel].flat()
    : [];
  const clinicalCodes = provision?.code?.coding
    ? [provision?.code?.coding].flat()
    : [];

  const allCodes = [...securityLabels, ...contentClasses, ...clinicalCodes]
    .filter((entry) => entry)
    .map(({ system, code }) => ({ system, code }));

  const obligation =
    decision === CONSENT_PERMIT
      ? CONSENT_OBLIGATIONS.CODES.EXCEPT(allCodes)
      : decision === CONSENT_DENY
        ? CONSENT_OBLIGATIONS.CODES.ONLY(allCodes)
        : null;

  return allCodes.length && obligation ? [obligation] : [];
}

function fhirBaseFromConsentUrl(fullUrl) {
  return !fullUrl ? "" : fullUrl.substring(0, fullUrl.indexOf("Consent"));
}

module.exports = {
  processProvision,
  matchPurposeOfUse
};
