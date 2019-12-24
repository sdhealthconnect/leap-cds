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

function setupMockPatient(patientId) {
  const system = patientId.system;
  const value = patientId.value;

  MOCK_FHIR_SERVERS[0]
    .get(`/Patient?identifier=${system}|${value}&_summary=true`)
    .reply(200, PATIENT_RESULTS_BUNDLE);

  _.slice(MOCK_FHIR_SERVERS, 1).forEach(mockServer => {
    mockServer
      .get(`/Patient?identifier=${system}|${value}&_summary=true`)
      .reply(200, EMPTY_BUNDLE);
  });
}

function setupMockOrganization(url, organizationResource) {
  MOCK_FHIR_SERVERS[0].get(url).reply(200, organizationResource);
}

function setupMockConsent(scope, consent) {
  const CONSENT_RESULTS_BUNDLE = consent
    ? _.set(
        _.set(
          _.set(_.clone(EMPTY_BUNDLE), "entry[0].resource", consent),
          "entry[0].fullUrl",
          `${CONSENT_FHIR_SERVERS[0]}/Consent/1`
        ),
        "total",
        1
      )
    : EMPTY_BUNDLE;

  MOCK_FHIR_SERVERS[0]
    .get(`/Consent?patient=Patient/52&scope=${scope}`)
    .reply(200, CONSENT_RESULTS_BUNDLE);
}

module.exports = {
  setupMockPatient,
  setupMockConsent,
  setupMockOrganization,
  MOCK_FHIR_SERVERS,
  CONSENT_FHIR_SERVERS
};
