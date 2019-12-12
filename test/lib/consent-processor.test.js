const _ = require("lodash");

const { processDecision } = require("../../lib/consent-processor");

const BASE_CONSENT = require("../fixtures/consents/consent-boris.json");
const ACTIVE_PRIVACY_CONSENT = BASE_CONSENT;
const INACTIVE_PRIVACY_CONSENT = _.set(
  _.cloneDeep(BASE_CONSENT),
  "status",
  "inactive"
);
const ACTIVE_RESEARCH_CONSENT = _.set(
  _.cloneDeep(BASE_CONSENT),
  "scope.coding[0].code",
  "research"
);

const ACTIVE_PRIVACY_OPTOUT_CONSENT = _.set(
  _.cloneDeep(BASE_CONSENT),
  "policyRule.coding[0].code",
  "OPTOUT"
);
const OLDER_ACTIVE_PRIVACY_OPTOUT_CONSENT = _.set(
  _.cloneDeep(ACTIVE_PRIVACY_OPTOUT_CONSENT),
  "dateTime",
  "2010-11-01"
);

const QUERY = {
  hook: "patient-consent-consult",
  hookInstance: "1",
  context: {
    patientId: {
      system: "http://hl7.org/fhir/sid/us-medicare",
      value: "0000-000-0000"
    },
    scope: "patient-privacy",
    purposeOfUse: "TREAT",
    actor: "bob@sample.org"
  }
};

it("active optin consent", () => {
  const decision = processDecision([ACTIVE_PRIVACY_CONSENT], QUERY.context);
  expect(decision).toMatchObject({
    decision: "CONSENT_PERMIT"
  });
});

it("no active optin consent", () => {
  const decision = processDecision([INACTIVE_PRIVACY_CONSENT], QUERY.context);
  expect(decision).toMatchObject({
    decision: "NO_CONSENT"
  });
});

it("active optin consent with different scope", () => {
  const decision = processDecision([ACTIVE_RESEARCH_CONSENT], QUERY.context);
  expect(decision).toMatchObject({
    decision: "NO_CONSENT"
  });
});

it("more recent consent takes precedence", () => {
  const decision = processDecision(
    [ACTIVE_PRIVACY_CONSENT, OLDER_ACTIVE_PRIVACY_OPTOUT_CONSENT],
    QUERY.context
  );
  expect(decision).toMatchObject({
    decision: "CONSENT_PERMIT"
  });
});
