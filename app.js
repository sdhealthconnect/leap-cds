const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");

const { ping } = require("./controllers/ping");
const { error } = require("./controllers/error");
const Hook = require("./controllers/patient-consent-consult");
const Xacml = require("./controllers/xacml");

const app = express();

//trust proxy
app.set("trust proxy", true);

//middlewares
process.env.NODE_ENV === "production" || app.use(morgan("dev"));
app.use(bodyParser.json({ type: "application/json" }));

//routes
app.get("/ping", ping);

app.post("/cds-services/patient-consent-consult", Hook.post);
app.post("/xacml", Xacml.post);

app.use(error);

module.exports = {
  app
};
