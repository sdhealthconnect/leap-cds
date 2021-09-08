const _ = require("lodash");
const superagent = require("superagent");

const CONSENT_FHIR_SERVERS = (process.env.CONSENT_FHIR_SERVERS || "")
  .split(",")
  .map(res => res.trim());

async function fetchConsents(patientIdentifiers, consentScope) {
  try {
    const patientFhirIds = await patientIds(patientIdentifiers);

    const consentSearchQueries = patientFhirIds.map(patientFhirId =>
      resolveConsents(
        patientFhirId.fhirBase,
        patientFhirId.patientId,
        consentScope
      )
    );

    const consentSearchResults = await Promise.all(consentSearchQueries);

    const resolvedConsents = consentSearchResults
      .filter(consentResult => consentResult.body.total)
      .map(consentResult => consentResult.body.entry);

    return _.flatten(resolvedConsents);
  } catch (e) {
    throw {
      httpCode: 503,
      error: "service_unavailable",
      errorMessage: `Error connecting to one of the consent services.`
    };
  }
}

function resolveConsents(fhirBase, patientId, consentScope) {
  const patientParam = {
    patient: `Patient/${patientId}`
  };
  const scopeParam = consentScope
    ? {
        scope: consentScope
      }
    : null;
  const params = { ...patientParam, ...scopeParam };
  return superagent
    .get(`${fhirBase}/Consent`)
    .query(params)
    .set({ Accept: "application/json" });
}

async function patientIds(patientIdentifiers) {
  const patientIdQueries = CONSENT_FHIR_SERVERS.map(fhirBase =>
    resolvePatientOnServer(fhirBase, patientIdentifiers)
  );

  const patientIds = await Promise.all(patientIdQueries);

  return _.zipWith(CONSENT_FHIR_SERVERS, patientIds, (fhirBase, patientId) => ({
    fhirBase,
    patientId
  })).filter(consentQuery => consentQuery.patientId);
}

async function resolvePatientOnServer(fhirBase, patientIdentifiers) {
  const patientSearchQueries = patientIdentifiers.map(patientIdentifier =>
    resolvePatientOnServerByIdentifer(fhirBase, patientIdentifier)
  );
  const patientIdSearchResults = await Promise.all(patientSearchQueries);

  const patientIds = patientIdSearchResults
    .map(patientIdResult => firstPatientId(patientIdResult))
    .filter(patientId => patientId);

  return _.first(patientIds);
}

function resolvePatientOnServerByIdentifer(fhirBase, patientIdentifier) {
  const query = {
    identifier: patientIdentifier.system
      ? `${patientIdentifier.system}|${patientIdentifier.value}`
      : `|${patientIdentifier.value}`
  };
  return superagent
    .get(`${fhirBase}/Patient`)
    .query(query)
    .query({ _summary: "true" })
    .set({ Accept: "application/json" });
}

function firstPatientId(patientSearchResult) {
  return _.get(patientSearchResult.body, "entry[0].resource.id");
}

module.exports = {
  fetchConsents
};
