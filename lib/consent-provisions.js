const _ = require("lodash");
const superagent = require("superagent");

const {
  PURPOSE_OF_USE_SYSTEM,
  CONSENT_OBLIGATIONS
} = require("./consent-valuesets");

const { CONSENT_PERMIT, CONSENT_DENY } = require("./consent-decisions");

function matchPurposeOfUse(provision, query) {
  const provisionPurposes = provision.purpose;

  return (
    !provision.purpose ||
    provisionPurposes.some(provisionPurpose =>
      _.isEqual(provisionPurpose, {
        system: PURPOSE_OF_USE_SYSTEM,
        code: query.purposeOfUse
      })
    )
  );
}

async function fetchActor(actorReference, fhirBase) {
  return superagent
    .get(`${fhirBase}${actorReference}`)
    .set({ Accept: "application/json" });
}

async function matchActor(provision, query, fhirServerBase) {
  const provisionActors = provision.actor || [];
  const actorReferencesPromises = provisionActors
    .map(actor => _.get(actor, "reference.reference"))
    .map(actorReference => fetchActor(actorReference, fhirServerBase));

  const actorResources = await Promise.all(actorReferencesPromises);

  const allActorIdentifiers = _.flatten(
    actorResources.map(actorResource => actorResource.body.identifier)
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
  const provisionClasses = provision.class || [];
  const queryClasses = query.class || [];

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

  const clinicalCodes = _.castArray(_.get(provision, "code.coding"));

  const allCodes = _.concat(
    securityLabels,
    contentClasses,
    clinicalCodes
  ).filter(entry => entry);

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
  processProvision
};
