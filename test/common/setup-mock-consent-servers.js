const _ = require("lodash");
const nock = require("nock");

const CONSENT_FHIR_SERVERS = (process.env.CONSENT_FHIR_SERVERS || "")
  .split(",")
  .map(res => res.trim());

const EMPTY_BUNDLE = require("../fixtures/empty-bundle.json");
const PATIENT = require("../fixtures/patients/patient-boris.json");

const PATIENT_RESULTS_BUNDLE = _.set(
  _.set(_.clone(EMPTY_BUNDLE), "entry[0].resource", PATIENT),
  "total",
  1
);

const MOCK_FHIR_SERVERS = CONSENT_FHIR_SERVERS.map(fhirBase =>
  nock(fhirBase)
    .defaultReplyHeaders({ "Content-Type": "application/json; charset=utf-8" })
    .replyContentLength()
);

function setupMockPatient(patientId, index) {
  const fhirServerIndex = index || 0;
  const system = patientId.system;
  const value = patientId.value;

  MOCK_FHIR_SERVERS[fhirServerIndex]
    .get("/Patient")
    .query({ identifier: `${system}|${value}`, _summary: "true" })
    .reply(200, PATIENT_RESULTS_BUNDLE);

  for (var i = 0; i < MOCK_FHIR_SERVERS.length; i++) {
    if (i == index) continue;

    MOCK_FHIR_SERVERS[i]
      .get("/Patient")
      .query({ identifier: `${system}|${value}`, _summary: "true" })
      .reply(200, EMPTY_BUNDLE);
  }
}

function setupMockOrganization(url, organizationResource, howManyRequests) {
  const numberOfTimes = howManyRequests || 1;
  MOCK_FHIR_SERVERS[0]
    .get(url)
    .times(numberOfTimes)
    .reply(200, organizationResource);
}

function setupMockAuditEndpoint(howManyRequests) {
  const numberOfTimes = howManyRequests || 1;
  MOCK_FHIR_SERVERS[0]
    .post("/AuditEvent")
    .times(numberOfTimes)
    .reply(200);
}

function setupMockPractitioner(url, practitionerResource, howManyRequests) {
  const numberOfTimes = howManyRequests || 1;
  MOCK_FHIR_SERVERS[0]
    .get(url)
    .times(numberOfTimes)
    .reply(200, practitionerResource);
}

function setupMockConsent(category, consent, index, patientId) {
  const fhirServerIndex = index || 0;
  const fhirPatientId = patientId || "Patient/52";

  const CONSENT_RESULTS_BUNDLE = consent
    ? _.set(
        _.set(
          _.set(
            _.clone(EMPTY_BUNDLE),
            "entry[0].resource",
            _.set(consent, "id", "1")
          ),
          "entry[0].fullUrl",
          `${CONSENT_FHIR_SERVERS[0]}/Consent/1`
        ),
        "total",
        1
      )
    : EMPTY_BUNDLE;

  MOCK_FHIR_SERVERS[fhirServerIndex]
    .get(`/Consent?patient=${fhirPatientId}`)
    .reply(200, CONSENT_RESULTS_BUNDLE);

  for (var i = 0; i < MOCK_FHIR_SERVERS.length; i++) {
    if (i == index) continue;

    MOCK_FHIR_SERVERS[i]
      .get(`/Consent?patient=${fhirPatientId}`)
      .reply(200, EMPTY_BUNDLE);
  }
}

function setupMockConsentNoCategory(consent, index, patientId) {
  const fhirServerIndex = index || 0;
  const fhirPatientId = patientId || "Patient/52";

  const CONSENT_RESULTS_BUNDLE = consent
    ? _.set(
        _.set(
          _.set(
            _.clone(EMPTY_BUNDLE),
            "entry[0].resource",
            _.set(consent, "id", "1")
          ),
          "entry[0].fullUrl",
          `${CONSENT_FHIR_SERVERS[0]}/Consent/1`
        ),
        "total",
        1
      )
    : EMPTY_BUNDLE;

  MOCK_FHIR_SERVERS[fhirServerIndex]
    .get(`/Consent?patient=${fhirPatientId}`)
    .reply(200, CONSENT_RESULTS_BUNDLE);

  for (var i = 0; i < MOCK_FHIR_SERVERS.length; i++) {
    if (i == index) continue;

    MOCK_FHIR_SERVERS[i]
      .get(`/Consent?patient=${fhirPatientId}`)
      .reply(200, EMPTY_BUNDLE);
  }
}

module.exports = {
  setupMockPatient,
  setupMockConsent,
  setupMockConsentNoCategory,
  setupMockOrganization,
  setupMockPractitioner,
  setupMockAuditEndpoint,
  MOCK_FHIR_SERVERS,
  CONSENT_FHIR_SERVERS
};
