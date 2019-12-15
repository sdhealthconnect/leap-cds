const _ = require("lodash");
const nock = require("nock");

const CONSENT_FHIR_SERVERS = (process.env.CONSENT_FHIR_SERVERS || "")
  .split(",")
  .map(res => res.trim());

const EMPTY_BUNDLE = require("../fixtures/empty-bundle.json");
const CONSENT = require("../fixtures/consents/consent-boris.json");
const PATIENT = require("../fixtures/patients/patient-boris.json");
const CONSENT_RESULTS_BUNDLE = _.set(
  _.set(_.clone(EMPTY_BUNDLE), "entry[0].resource", CONSENT),
  "total",
  1
);
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

function setupMockPatients(patientId) {
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

function setupMockConsents(scope) {
  MOCK_FHIR_SERVERS[0]
    .get(`/Consent?patient=Patient/52&scope=${scope}`)
    .reply(200, CONSENT_RESULTS_BUNDLE);
}

module.exports = {
  setupMockPatients,
  setupMockConsents,
  MOCK_FHIR_SERVERS
};
