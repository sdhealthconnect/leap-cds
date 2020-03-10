const request = require("supertest");
const { app } = require("../../app");

const ENDPOINT = "/xacml";

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
