const nock = require("nock");
const { fetchConsents } = require("../../lib/consent-discovery");

const CONSENT = require("../fixtures/consents/consent-boris-optin.json");

const {
  setupMockPatient,
  setupMockConsent,
  setupMockConsentNoScope,
  MOCK_FHIR_SERVERS
} = require("../common/setup-mock-consent-servers");

afterEach(() => {
  nock.cleanAll();
});

it("make sure there is at least one FHIR Consent Server", async () => {
  expect(MOCK_FHIR_SERVERS.length).toBeGreaterThan(0);
});

it("should return an array of consents from all servers with consent scope", async () => {
  expect.assertions(1);

  setupMockPatient({ system: "ssn", value: "111111111" });
  setupMockConsent("patient-privacy", CONSENT);

  const consents = await fetchConsents(
    [{ system: "ssn", value: "111111111" }],
    "patient-privacy"
  );
  expect(consents).toHaveLength(1);
});

it("should return an array of consents from all servers without consent scope", async () => {
  expect.assertions(1);

  setupMockPatient({ system: "ssn", value: "111111111" });
  setupMockConsentNoScope(CONSENT);

  const consents = await fetchConsents([{ system: "ssn", value: "111111111" }]);
  expect(consents).toHaveLength(1);
});

it("should return an array of consents from all servers based on multiple patient identifiers", async () => {
  expect.assertions(1);

  setupMockPatient({ system: "ssn", value: "111111111" }, 0);
  setupMockPatient({ system: "other-system", value: "22222222" }, 1);
  setupMockConsent("patient-privacy", CONSENT, 0);

  const consents = await fetchConsents(
    [
      { system: "other-system", value: "22222222" },
      { system: "ssn", value: "111111111" }
    ],
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
