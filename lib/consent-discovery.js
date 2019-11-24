const _ = require("lodash");
const rp = require("request-promise");

const CONSENT_FHIR_SERVERS = (process.env.CONSENT_FHIR_SERVERS || "")
  .split(",")
  .map(res => res.trim());

async function fetchConsents(patientIdentifier) {
  try {
    const patientFhirIds = await patientIds(patientIdentifier);

    const consentSearchQueries = patientFhirIds.map(patientFhirId =>
      resolveConsent(patientFhirId.fhirBase, patientFhirId.patientId)
    );

    const consentSearchResults = await Promise.all(consentSearchQueries);

    const resolvedConsents = consentSearchResults
      .filter(consentResult => consentResult.total)
      .map(consentResult => consentResult.entry);

    return _.flatten(resolvedConsents);
  } catch (e) {
    throw {
      httpCode: 503,
      error: "service_unavailable",
      errorMessage: `Error connecting to one of the consent services.`
    };
  }
}

function resolveConsent(fhirBase, patientId) {
  const consentQuery = `${fhirBase}/Consent?patient=Patient/${patientId}`;
  const httpRequest = {
    method: "GET",
    json: true,
    uri: consentQuery
  };
  return rp(httpRequest);
}

async function patientIds(patientIdentifier) {
  const patientSearchQueries = CONSENT_FHIR_SERVERS.map(fhirBase =>
    resolvePatient(fhirBase, patientIdentifier)
  );

  const patientSearchResults = await Promise.all(patientSearchQueries);

  const patientIds = patientSearchResults.map(patientIdResult =>
    firstPatientId(patientIdResult)
  );

  return _.zipWith(CONSENT_FHIR_SERVERS, patientIds, (fhirBase, patientId) => ({
    fhirBase,
    patientId
  })).filter(consentQuery => consentQuery.patientId);
}

function resolvePatient(fhirBase, patientIdentifier) {
  const query = `${fhirBase}/Patient?identifier=${patientIdentifier.system}|${patientIdentifier.value}&_summary=true`;
  const httpRequest = {
    method: "GET",
    json: true,
    uri: query
  };
  return rp(httpRequest);
}

function firstPatientId(patientSearchResult) {
  return _.get(patientSearchResult, "entry[0].resource.id");
}

module.exports = {
  fetchConsents
};
