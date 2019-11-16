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
