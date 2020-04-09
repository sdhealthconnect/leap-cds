const _ = require("lodash");
const superagent = require("superagent");

const {
  PURPOSE_OF_USE_SYSTEM,
  PROVISION_TYPE,
  CONSENT_OBLIGATIONS
} = require("./consent-valuesets");

const {
  CONSENT_PERMIT,
  CONSENT_DENY,
  NO_CONSENT
} = require("./consent-decisions");

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

async function fetchActor(actorReference, fhirBase) {
  return superagent
    .get(`${fhirBase}${actorReference}`)
    .set({ Accept: "application/json" });
}

async function processProvision(provision, query, fullUrl) {
  if (!provision) {
    return {
      decision: NO_CONSENT,
      obligations: []
    };
  }

  const permit = provision.type === PROVISION_TYPE.PERMIT;
  const matchedActor = await matchActor(
    provision,
    query,
    fhirBaseFromFullResourceUrl(fullUrl)
  );

  const match = matchPurposeOfUse(provision, query) && matchedActor;

  const initialDecision =
    match && permit ? CONSENT_PERMIT : match ? CONSENT_DENY : NO_CONSENT;

  const finalDecision = willHaveObligations(provision)
    ? NO_CONSENT
    : initialDecision;

  return {
    decision: finalDecision,
    obligations: determineObligations(initialDecision, provision)
  };
}

function willHaveObligations(provision) {
  const securityLabels = _.castArray(provision.securityLabel);
  const contentClasses = _.castArray(provision.class);
  const clinicalCodes = _.castArray(_.get(provision, "code.coding"));
  const allCodes = _.concat(
    securityLabels,
    contentClasses,
    clinicalCodes
  ).filter(code => code);

  return allCodes.length;
}

function determineObligations(decision, provision) {
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
      ? CONSENT_OBLIGATIONS.CODES.ONLY(allCodes)
      : decision === CONSENT_DENY
      ? CONSENT_OBLIGATIONS.CODES.EXCEPT(allCodes)
      : null;

  return allCodes.length && obligation ? [obligation] : [];
}

function fhirBaseFromFullResourceUrl(fullUrl) {
  return !fullUrl ? "" : fullUrl.substring(0, fullUrl.indexOf("Consent"));
}

module.exports = {
  processProvision
};
