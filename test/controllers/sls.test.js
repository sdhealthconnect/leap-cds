const _ = require("lodash");
const request = require("supertest");
const { app } = require("../../app");

const BUNDLE = require("../fixtures/empty-bundle.json");
const OBSERVATION = require("../fixtures/observations/observations-ketamine.json");
const NON_SENSITIVE_OBSERVATION = require("../fixtures/observations/observation-bacteria.json");

it("should return 200 and a labeled bundle", async () => {
  const bundleOfObservations = _.cloneDeep(BUNDLE);
  bundleOfObservations.entry = [
    { fullUrl: "1", resource: OBSERVATION },
    { fullUrl: "2", resource: NON_SENSITIVE_OBSERVATION }
  ];
  bundleOfObservations.total = 2;

  const res = await request(app)
    .post("/sls")
    .set("Accept", "application/json")
    .send(bundleOfObservations);

  expect(res.status).toEqual(200);

  expect(res.body.entry[0].resource.meta?.security).toMatchObject(
    expect.arrayContaining([
      expect.objectContaining({
        system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
        code: "SUD"
      }),
      expect.objectContaining({
        system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality",
        code: "R"
      })
    ])
  );
});
