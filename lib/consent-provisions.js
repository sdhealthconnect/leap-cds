const _ = require("lodash");
const superagent = require("superagent");
const { maybeAddAuth } = require("../lib/auth");

const {
  PURPOSE_OF_USE_SYSTEM,
  CONSENT_OBLIGATIONS
} = require("./consent-valuesets");

const { CONSENT_PERMIT, CONSENT_DENY } = require("./consent-decisions");

function matchPurposeOfUse(provision, query) {
  const untrimmedPurposes = provision?.purpose || [];
  const untrimmedQueriedPurposes = query.purposeOfUse
    ? _.castArray(query.purposeOfUse)
    : [];

  const purposes = untrimmedPurposes
    .map((purpose) => _.pick(purpose, ["system", "code"]))
    .filter((purpose) => purpose);

  const queriedPurposes = untrimmedQueriedPurposes.map((purpose) => ({
    system: PURPOSE_OF_USE_SYSTEM,
    code: purpose
  }));

  return (
    !query.purposeOfUse ||
    !provision?.purpose ||
    _.intersectionWith(queriedPurposes, purposes, _.isEqual).length
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
    .map((actor) => actor?.reference?.reference)
    .map((actorReference) => fetchActor(actorReference, fhirServerBase));

  const actorResources = await Promise.all(actorReferencesPromises);

  const allActorIdentifiers = _.flatten(
    actorResources.map((actorResource) => actorResource.body.identifier)
  );

  const queryActorIds = query.actor;

  const matchingIdentifiers = _.intersectionWith(
    allActorIdentifiers,
    queryActorIds,
    _.isEqual
  );

  return !provision.actor || matchingIdentifiers.length > 0;
}

function matchClass(provision, query) {
  const untrimmedProvisionClasses = provision.class || [];
  const untrimmedQueryClasses = query.class || [];

  const provisionClasses = untrimmedProvisionClasses.map((value) =>
    _.pick(value, ["system", "code"])
  );
  const queryClasses = untrimmedQueryClasses.map((value) =>
    _.pick(value, ["system", "code"])
  );

  const matchingClasses = _.intersectionWith(
    provisionClasses,
    queryClasses,
    _.isEqual
  );

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
  const securityLabels = _.castArray(provision.securityLabel);
  const contentClasses = _.castArray(provision.class);
  const clinicalCodes = _.castArray(provision?.code?.coding);

  const allCodes = _.concat(securityLabels, contentClasses, clinicalCodes)
    .filter((entry) => entry)
    .map((code) => _.pick(code, ["system", "code"]));

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
