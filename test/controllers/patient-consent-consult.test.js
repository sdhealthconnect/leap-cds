const _ = require("lodash");
const request = require("supertest");
const { app } = require("../../app");
const {
  setupMockPatient,
  setupMockConsent,
  setupMockOrganization
} = require("../common/setup-mock-consent-servers");

const CONSENT_OPTIN = require("../fixtures/consents/consent-boris.json");
const CONSENT_OPTOUT = _.set(
  _.cloneDeep(CONSENT_OPTIN),
  "policyRule.coding[0].code",
  "OPTOUT"
);

const HOOK_ENDPOINT = "/cds-services/patient-consent-consult";

it("should return 400 on bad query", async () => {
  expect.assertions(4);

  let res = await request(app)
    .post(HOOK_ENDPOINT)
    .set("Accept", "application/json")
    .send({});
  expect(res.status).toEqual(400);
  expect(res.body).toMatchObject({ error: "bad_request" });

  res = await request(app)
    .post(HOOK_ENDPOINT)
    .set("Accept", "application/json")
    .send({
      hookInstance: "12342"
    });
  expect(res.status).toEqual(400);
  expect(res.body).toMatchObject({ error: "bad_request" });
});

it("should return 400 on wrong hook name", async () => {
  expect.assertions(3);

  const res = await request(app)
    .post(HOOK_ENDPOINT)
    .set("Accept", "application/json")
    .send({
      hook: "wrongName",
      hookInstance: "12342",
      context: {}
    });
  expect(res.status).toEqual(400);
  expect(res.body).toMatchObject({ error: "bad_request" });
  expect(res.body.errorMessage).toMatch("patient-consent-consult");
});

const REQUEST = {
  hook: "patient-consent-consult",
  hookInstance: "1234",
  context: {
    patientId: {
      system: "http://hl7.org/fhir/sid/us-medicare",
      value: "0000-000-0000"
    },
    scope: "patient-privacy",
    actor: [
      {
        system: "test-system",
        value: "test-value"
      }
    ]
  }
};

const MOCK_PATIENT_ID = {
  system: "http://hl7.org/fhir/sid/us-medicare",
  value: "0000-000-0000"
};

const ORGANIZATION = require("../fixtures/organizations/org-good-health.json");

it("should return 200 and an array including a consent permit card with an OPTIN consent", async () => {
  expect.assertions(2);

  setupMockPatient(MOCK_PATIENT_ID);
  setupMockConsent("patient-privacy", CONSENT_OPTIN);
  setupMockOrganization(
    `/${_.get(
      CONSENT_OPTIN,
      "provision.provision.actor[0].reference.reference"
    )}`,
    ORGANIZATION
  );

  const res = await request(app)
    .post(HOOK_ENDPOINT)
    .set("Accept", "application/json")
    .send(REQUEST);
  expect(res.status).toEqual(200);
  console.log(JSON.stringify(res.body));
  expect(res.body).toMatchObject({
    cards: expect.arrayContaining([
      expect.objectContaining({
        summary: "CONSENT_PERMIT",
        extension: { Decision: "Permit", Obligations: [] }
      })
    ])
  });
});

it("should return 200 and an array including a consent deny card with an OPTIN consent and provision with a matching prohibited recipient", async () => {
  expect.assertions(2);

  setupMockPatient(MOCK_PATIENT_ID);
  setupMockConsent("patient-privacy", CONSENT_OPTIN);
  setupMockOrganization(
    `/${_.get(
      CONSENT_OPTIN,
      "provision.provision.actor[0].reference.reference"
    )}`,
    ORGANIZATION
  );

  const REQUEST_WITH_PROHIBITED_ACTOR = _.set(
    _.cloneDeep(REQUEST),
    "context.actor",
    [ORGANIZATION.identifier[0]]
  );

  const res = await request(app)
    .post(HOOK_ENDPOINT)
    .set("Accept", "application/json")
    .send(REQUEST_WITH_PROHIBITED_ACTOR);
  expect(res.status).toEqual(200);
  expect(res.body).toMatchObject({
    cards: expect.arrayContaining([
      expect.objectContaining({
        summary: "CONSENT_DENY",
        extension: { Decision: "Deny" }
      })
    ])
  });
});

it("should return 200 and an array including a consent deny card with an OPTOUT consent", async () => {
  expect.assertions(2);

  setupMockPatient(MOCK_PATIENT_ID);
  setupMockConsent("patient-privacy", CONSENT_OPTOUT);
  setupMockOrganization(
    `/${_.get(
      CONSENT_OPTIN,
      "provision.provision.actor[0].reference.reference"
    )}`,
    ORGANIZATION
  );

  const res = await request(app)
    .post(HOOK_ENDPOINT)
    .set("Accept", "application/json")
    .send(REQUEST);
  expect(res.status).toEqual(200);
  expect(res.body).toMatchObject({
    cards: expect.arrayContaining([
      expect.objectContaining({
        summary: "CONSENT_DENY",
        extension: { Decision: "Deny" }
      })
    ])
  });
});

it("should return 200 and an array including a NO_CONSENT card when no consent exists", async () => {
  expect.assertions(2);

  setupMockPatient(MOCK_PATIENT_ID);
  setupMockConsent("patient-privacy", null);

  const res = await request(app)
    .post(HOOK_ENDPOINT)
    .set("Accept", "application/json")
    .send(REQUEST);
  expect(res.status).toEqual(200);
  expect(res.body).toMatchObject({
    cards: expect.arrayContaining([
      expect.objectContaining({
        summary: "NO_CONSENT",
        extension: { Decision: "NotApplicable" }
      })
    ])
  });
});
