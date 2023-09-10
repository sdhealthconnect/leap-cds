const _ = require("lodash");
const superagent = require("superagent");
const logger = require("../lib/logger");
const { maybeAddAuth } = require("../lib/auth");

const CONSENT_FHIR_SERVERS = (process.env.CONSENT_FHIR_SERVERS || "")
  .split(",")
  .map((res) => res.trim());

async function fetchConsents(patientIdentifiers, category) {
  try {
    const patientFhirIds = await patientIds(patientIdentifiers);

    const consentSearchQueries = patientFhirIds.map((patientFhirId) =>
      resolveConsents(patientFhirId.fhirBase, patientFhirId.patientId, category)
    );

    const consentSearchResults = await Promise.all(consentSearchQueries);

    const resolvedConsents = consentSearchResults
      .filter((consentResult) => consentResult.body.total)
      .map((consentResult) => consentResult.body.entry);

    return _.flatten(resolvedConsents);
  } catch (e) {
    logger.warn(e);
    throw {
      httpCode: 503,
      error: "service_unavailable",
      errorMessage: `Error connecting to one of the consent services.`
    };
  }
}

function resolveConsents(fhirBase, patientId, category) {
  const patientParam = {
    patient: `Patient/${patientId}`
  };
  //todo: incorporate categoty into the search parameters

  const params = { ...patientParam };

  return maybeAddAuth(
    superagent
      .get(`${fhirBase}/Consent`)
      .query(params)
      .set({ Accept: "application/json" })
  );
}

async function patientIds(patientIdentifiers) {
  const patientIdQueries = CONSENT_FHIR_SERVERS.map((fhirBase) =>
    resolvePatientOnServer(fhirBase, patientIdentifiers)
  );

  const patientIds = await Promise.all(patientIdQueries);

  return _.zipWith(CONSENT_FHIR_SERVERS, patientIds, (fhirBase, patientId) => ({
    fhirBase,
    patientId
  })).filter((consentQuery) => consentQuery.patientId);
}

async function resolvePatientOnServer(fhirBase, patientIdentifiers) {
  const patientSearchQueries = patientIdentifiers.map((patientIdentifier) =>
    resolvePatientOnServerByIdentifer(fhirBase, patientIdentifier)
  );
  const patientIdSearchResults = await Promise.all(patientSearchQueries);

  const patientIds = patientIdSearchResults
    .map((patientIdResult) => firstPatientId(patientIdResult))
    .filter((patientId) => patientId);

  return patientIds?.[0];
}

function resolvePatientOnServerByIdentifer(fhirBase, patientIdentifier) {
  const query = {
    identifier: patientIdentifier.system
      ? `${patientIdentifier.system}|${patientIdentifier.value}`
      : `|${patientIdentifier.value}`
  };
  return maybeAddAuth(
    superagent
      .get(`${fhirBase}/Patient`)
      .query(query)
      // .query({ _summary: "true" }) not implemented by some servers.
      .set({ Accept: "application/json" })
  );
}

const firstPatientId = (patientSearchResult) =>
  patientSearchResult.body?.entry?.[0]?.resource?.id;

module.exports = {
  fetchConsents
};
