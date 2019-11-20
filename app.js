const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");

const { ping } = require("./controllers/ping");
const { error } = require("./controllers/error");
const { hook } = require("./controllers/patient-consent-consult");

const app = express();

//middlewares
process.env.NODE_ENV === "production" || app.use(morgan("dev"));
app.use(bodyParser.json({ type: "application/json" }));

//routes
app.get("/ping", ping);

app.post("/cds-services/patient-consent-consult", hook);

app.use(error);

module.exports = {
  app
};
