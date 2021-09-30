const request = require("supertest");
const { app } = require("../../app");

it("should respond to ping", async () => {
  expect.assertions(2);

  const res = await request(app).get("/cds-services");
  expect(res.status).toEqual(200);
  expect(res.body).toEqual(
    expect.objectContaining({
      services: expect.arrayContaining([
        expect.objectContaining({ id: "patient-consent-consult" })
      ])
    })
  );
});
