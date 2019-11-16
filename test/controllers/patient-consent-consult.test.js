const request = require("supertest");
const { app } = require("../../app");

const HOOK_ENDPOINT = "/cds-services/patient-consent-consult";

it("should return 400 on bad query", async () => {
  expect.assertions(2);

  let res = await request(app)
    .post(HOOK_ENDPOINT)
    .set("Accept", "application/json")
    .send({});
  expect(res.status).toEqual(400);
  expect(res.body).toMatchObject({ error: "bad_request" });
});
