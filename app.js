const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");

const { ping } = require("./controllers/ping");
const { error } = require("./controllers/error");
const { discovery } = require("./controllers/discovery");
const ConsentDecisionHook = require("./controllers/patient-consent-consult");
const Xacml = require("./controllers/xacml");
const SLS = require("./controllers/sls");
const SLSHook = require("./controllers/bundle-security-label");

const app = express();

//trust proxy
app.set("trust proxy", true);

//middlewares
process.env.NODE_ENV === "production" || app.use(morgan("dev"));
app.use(bodyParser.json({ type: "application/json" }));

//routes
app.get("/ping", ping);

app.get("/cds-services", discovery);

app.post("/cds-services/patient-consent-consult", ConsentDecisionHook.post);
app.post("/xacml", Xacml.post);
app.post("/sls", SLS.post);
app.post("/cds-services/bundle-security-label", SLSHook.post);

app.use(error);

module.exports = {
  app
};
