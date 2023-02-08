const superagent = require("superagent");
const dotenv = require("dotenv");
dotenv.config();

const { maybeAddAuth } = require("./lib/auth");

const CONSENT_FHIR_SERVERS = (process.env.CONSENT_FHIR_SERVERS || "")
  .split(",")
  .map((res) => res.trim());

async function run() {
  const fhirBase = CONSENT_FHIR_SERVERS[0];
  const fhirRes = await maybeAddAuth(superagent.get(`${fhirBase}/Consent`));
  console.log(fhirRes.body);
}

(async () => {
  try {
    await run();
  } catch (err) {
    console.error(err);
  }
})();
