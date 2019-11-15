const request = require("supertest");
const { app } = require("../../app");

const HOOK_ENDPOINT = "/cds-services/patient-consent-consult";

it("should respond to a consent query", async () => {
  expect.assertions(2);

  const res = await request(app)
    .post(HOOK_ENDPOINT)
    .set("Accept", "application/json")
    .send({});
  expect(res.status).toEqual(200);
  expect(res.body).toMatchObject({});
});
