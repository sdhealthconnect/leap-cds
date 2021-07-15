const _ = require("lodash");
const nock = require("nock");

const request = require("supertest");
const { app } = require("../../app");
const {
  setupMockPatient,
  setupMockConsent,
  setupMockOrganization,
  setupMockAuditEndpoint
} = require("../common/setup-mock-consent-servers");

const Ajv = require("ajv");

const ENDPOINT = "/xacml";

afterEach(() => {
  nock.cleanAll();
});

it("should return 400 on bad query", async () => {
  expect.assertions(4);

  let res = await request(app)
    .post(ENDPOINT)
    .set("Accept", "application/json")
    .send({});
  expect(res.status).toEqual(400);
  expect(res.body).toMatchObject({ error: "bad_request" });

  res = await request(app)
    .post(ENDPOINT)
    .set("Accept", "application/json")
    .send({
      Request: {
        AccessSubject: [],
        Action: [],
        Resource: []
      }
    });
  expect(res.status).toEqual(400);
  expect(res.body).toMatchObject({ error: "bad_request" });
});

it("should return 400 on missing required attribtues", async () => {
  expect.assertions(15);

  let res = await request(app)
    .post(ENDPOINT)
    .set("Accept", "application/json")
    .send({
      Request: {
        AccessSubject: [
          {
            Attribute: [
              {
                AttributeId: "actor",
                Value: [
                  {
                    system: "sample-system",
                    value: "sample-id"
                  }
                ]
              }
            ]
          }
        ],
        Action: [],
        Resource: []
      }
    });
  expect(res.status).toEqual(400);
  expect(res.body).toMatchObject({ error: "bad_request" });
  expect(res.body.errorMessage).toMatch("Action");

  res = await request(app)
    .post(ENDPOINT)
    .set("Accept", "application/json")
    .send({
      Request: {
        AccessSubject: [
          {
            Attribute: [
              {
                AttributeId: "notActor",
                Value: [
                  {
                    system: "sample-system",
                    value: "sample-id"
                  }
                ]
              }
            ]
          }
        ],
        Action: [],
        Resource: []
      }
    });
  expect(res.status).toEqual(400);
  expect(res.body).toMatchObject({ error: "bad_request" });
  expect(res.body.errorMessage).toMatch("AccessSubject");

  res = await request(app)
    .post(ENDPOINT)
    .set("Accept", "application/json")
    .send({
      Request: {
        AccessSubject: [
          {
            Attribute: [
              {
                AttributeId: "actor",
                Value: [
                  {
                    system: "sample-system",
                    value: "sample-id"
                  }
                ]
              }
            ]
          }
        ],
        Action: [
          {
            Attribute: [
              {
                AttributeId: "purposeOfUse",
                Value: "TREAT"
              }
            ]
          }
        ],
        Resource: []
      }
    });
  expect(res.status).toEqual(400);
  expect(res.body).toMatchObject({ error: "bad_request" });
  expect(res.body.errorMessage).toMatch("Resource");

  res = await request(app)
    .post(ENDPOINT)
    .set("Accept", "application/json")
    .send({
      Request: {
        AccessSubject: [
          {
            Attribute: [
              {
                AttributeId: "actor",
                Value: [
                  {
                    system: "sample-system",
                    value: "sample-id"
                  }
                ]
              }
            ]
          }
        ],
        Action: [
          {
            Attribute: [
              {
                AttributeId: "scope",
                Value: "adr"
              },
              {
                AttributeId: "purposeOfUse",
                Value: "TREAT"
              }
            ]
          }
        ],
        Resource: []
      }
    });
  expect(res.status).toEqual(400);
  expect(res.body).toMatchObject({ error: "bad_request" });
  expect(res.body.errorMessage).toMatch("Resource");

  res = await request(app)
    .post(ENDPOINT)
    .set("Accept", "application/json")
    .send({
      Request: {
        AccessSubject: [
          {
            Attribute: [
              {
                AttributeId: "actor",
                Value: [
                  {
                    system: "sample-system",
                    value: "sample-id"
                  }
                ]
              }
            ]
          }
        ],
        Action: [
          {
            Attribute: [
              {
                AttributeId: "scope",
                Value: "adr"
              },
              {
                AttributeId: "purposeOfUse",
                Value: "TREAT"
              }
            ]
          }
        ],
        Resource: [
          {
            Attribute: [
              {
                AttributeId: "patientId",
                Value: [
                  {
                    system: "http://hl7.org/fhir/sid/us-medicare",
                    notValue: "0000-000-0000"
                  }
                ]
              }
            ]
          }
        ]
      }
    });
  expect(res.status).toEqual(400);
  expect(res.body).toMatchObject({ error: "bad_request" });
  expect(res.body.errorMessage).toMatch("Resource");
});

it("should return a response compliant with the response schema", async () => {
  const REQUEST = require("../fixtures/request-samples/xacml-request.json");
  const MOCK_PATIENT_ID = {
    system: "http://hl7.org/fhir/sid/us-medicare",
    value: "0000-000-0000"
  };
  const ORGANIZATION = require("../fixtures/organizations/org-good-health.json");
  const ACTIVE_PRIVACY_CONSENT_WITH_SEC_LABEL_PROVISION = require("../fixtures/consents/consent-boris-deny-restricted-label.json");

  expect.assertions(1);

  setupMockAuditEndpoint();
  setupMockPatient(MOCK_PATIENT_ID);
  setupMockConsent(
    "patient-privacy",
    ACTIVE_PRIVACY_CONSENT_WITH_SEC_LABEL_PROVISION
  );
  setupMockOrganization(
    `/${_.get(
      ACTIVE_PRIVACY_CONSENT_WITH_SEC_LABEL_PROVISION,
      "provision.provision[0].actor[0].reference.reference"
    )}`,
    ORGANIZATION
  );

  const REQUEST_WITH_PROHIBITED_ACTOR = _.set(
    _.cloneDeep(REQUEST),
    "Request.AccessSubject[0].Attribute[0].Value",
    [ORGANIZATION.identifier[0]]
  );

  const res = await request(app)
    .post(ENDPOINT)
    .set("Accept", "application/json")
    .send(REQUEST_WITH_PROHIBITED_ACTOR);

  const xacmlResponseSchema = require("../../schemas/xacml-response.schema.json");
  const ajv = new Ajv();
  const xacmlResponseValidator = ajv.compile(xacmlResponseSchema);
  const validationResults = xacmlResponseValidator(res.body);
  expect(validationResults).toEqual(true);
});
