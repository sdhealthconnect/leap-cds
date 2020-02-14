const _ = require("lodash");
const { fetchConsents } = require("../../lib/consent-discovery");

const CONSENT = require("../fixtures/consents/consent-boris.json");

const {
  setupMockPatient,
  setupMockConsent,
  MOCK_FHIR_SERVERS
} = require("../common/setup-mock-consent-servers");

it("make sure there is at least one FHIR Consent Server", async () => {
  expect(MOCK_FHIR_SERVERS.length).toBeGreaterThan(0);
});

it("should return an array of consents from all servers", async () => {
  expect.assertions(2);

  setupMockPatient({ system: "ssn", value: "111111111" });
  setupMockConsent("", CONSENT);

  let consents = await fetchConsents([{ system: "ssn", value: "111111111" }]);
  expect(consents).toHaveLength(1);

  setupMockPatient({ system: "ssn", value: "111111111" });
  setupMockConsent("patient-privacy", CONSENT);

  consents = await fetchConsents(
    [{ system: "ssn", value: "111111111" }],
    "patient-privacy"
  );
  expect(consents).toHaveLength(1);
});

it("should throw an exception if consent servers don't respond.", async () => {
  expect.assertions(1);
  try {
    await fetchConsents([{ system: "ssn", value: "111111111" }]);
  } catch (e) {
    expect(e).toMatchObject({
      error: "service_unavailable"
    });
  }
});
