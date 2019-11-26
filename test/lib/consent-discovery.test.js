const _ = require("lodash");
const nock = require("nock");
const { fetchConsents } = require("../../lib/consent-discovery");

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

it("make sure there is at least one FHIR Consent Server", async () => {
  expect(MOCK_FHIR_SERVERS.length).toBeGreaterThan(0);
});

it("should return an array of consents from all servers", async () => {
  expect.assertions(1);

  MOCK_FHIR_SERVERS[0]
    .get("/Patient?identifier=ssn|111111111&_summary=true")
    .reply(200, PATIENT_RESULTS_BUNDLE);

  MOCK_FHIR_SERVERS[0]
    .get("/Consent?patient=Patient/52")
    .reply(200, CONSENT_RESULTS_BUNDLE);

  _.slice(MOCK_FHIR_SERVERS, 1).forEach(mockServer => {
    mockServer
      .get("/Patient?identifier=ssn|111111111&_summary=true")
      .reply(200, EMPTY_BUNDLE);
  });

  const consents = await fetchConsents({ system: "ssn", value: "111111111" });

  expect(consents).toHaveLength(1);
});

it("should throw an exception if consent servers don't respond.", async () => {
  expect.assertions(1);
  try {
    await fetchConsents({ system: "ssn", value: "111111111" });
  } catch (e) {
    expect(e).toMatchObject({
      error: "service_unavailable"
    });
  }
});
