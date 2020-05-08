const _ = require("lodash");
const fs = require("fs");
const superagent = require("superagent");

const FHIR_BASE = _.get(process.argv, "[2]");

const LEAP_IDENTIFIER_SYSTEM =
  "http://sdhealthconnect.github.io/leap/samples/ids";

function printUsageAndExit() {
  console.error(
    "Usage: node load-fixtures FHIR_BASE CONSENT_FILE (file name of the consent file in 'fixtures/consents'"
  );
  console.error(
    "See documentation at https://github.com/sdhealthconnect/leap-cds"
  );
  process.exit(1);
}

function getLeapIdentifer(resource) {
  return resource.identifier.filter(
    identifier => identifier.system === LEAP_IDENTIFIER_SYSTEM
  )[0].value;
}

const CONSENT_FILE = `../test/fixtures/consents/${_.get(process.argv, "[3]")}`;

if (!FHIR_BASE || !CONSENT_FILE || !fs.existsSync(CONSENT_FILE)) {
  printUsageAndExit();
}

const patient = require("../test/fixtures/patients/patient-boris.json");
const consentOrg = require("../test/fixtures/organizations/org-hl7.json");
const actorOrg = require("../test/fixtures/organizations/org-good-health.json");
const consent = require(CONSENT_FILE);

patient.id = "thePatient";
consentOrg.id = "theConsentOrg";
actorOrg.id = "theActorOrg";
consent.patient.reference = `Patient/${patient.id}`;
consent.organization[0].reference = `Organization/${consentOrg.id}`;
consent.provision.provision = consent.provision.provision.map(provision =>
  _.set(
    _.cloneDeep(provision),
    "actor[0].reference.reference",
    `Organization/${actorOrg.id}`
  )
);
consent.dateTime = new Date().toISOString();

const entries = [patient, actorOrg, consentOrg, consent].map(resource => ({
  fullUrl: "",
  resource: resource,
  request: {
    method: "PUT",
    url: `${
      resource.resourceType
    }?identifier=${LEAP_IDENTIFIER_SYSTEM}|${getLeapIdentifer(resource)}`
  }
}));

const transaction = {
  resourceType: "Bundle",
  id: "bundle-transaction",
  meta: {
    lastUpdated: new Date().toISOString()
  },
  type: "transaction",
  entry: entries
};

superagent
  .post(FHIR_BASE)
  .set("Content-Type", "application/json")
  .send(transaction)
  .then(res => {
    console.log(JSON.stringify(res.body, null, 2));
  })
  .catch(err => {
    console.log(err);
  });
