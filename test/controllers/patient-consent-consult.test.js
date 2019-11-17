const request = require("supertest");
const { app } = require("../../app");

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

it("should return 200 and a card array on success", async () => {
  expect.assertions(2);

  const res = await request(app)
    .post(HOOK_ENDPOINT)
    .set("Accept", "application/json")
    .send({
      hook: "patient-consent-consult",
      hookInstance: "1234",
      context: {
        patientId: {
          system: "http://hl7.org/fhir/sid/us-medicare",
          value: "0000-000-0000"
        },
        scope: "adr"
      }
    });
  expect(res.status).toEqual(200);
  expect(res.body).toMatchObject({
    cards: expect.arrayContaining([
      expect.objectContaining({ summary: expect.any(String) })
    ])
  });
});
