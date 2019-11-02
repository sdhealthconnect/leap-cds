const request = require("supertest");
const { app } = require("../../app");

it("should respond to ping", async () => {
  expect.assertions(2);

  const res = await request(app).get("/ping");
  expect(res.status).toEqual(200);
  expect(res.body).toMatchObject({});
});

it("should respond to ping when requested error", async () => {
  expect.assertions(4);

  let res = await request(app).get("/ping?error=bad_request");
  expect(res.status).toEqual(400);
  expect(res.body).toMatchObject({ error: "bad_request" });

  res = await request(app).get("/ping?error=internal_error");
  expect(res.status).toEqual(500);
  expect(res.body).toMatchObject({ error: "internal_error" });
});
  
