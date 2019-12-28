const _ = require("lodash");

const {
  setupMockOrganization,
  CONSENT_FHIR_SERVERS
} = require("../common/setup-mock-consent-servers");

const { PURPOSE_OF_USE_SYSTEM } = require("../../lib/consent-valuesets");

const { processDecision } = require("../../lib/consent-processor");

const ORGANIZATION = require("../fixtures/organizations/org-good-health.json");
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
    actor: [
      {
        system: "test-system",
        value: "test-value"
      }
    ]
  }
};

it("active optin consent", async () => {
  setupMockOrganization(
    `/${_.get(BASE_CONSENT, "provision.actor[0].reference.reference")}`,
    ORGANIZATION
  );

  const decision = await processDecision(
    [
      {
        fullUrl: `${CONSENT_FHIR_SERVERS[0]}/Consent/1`,
        resource: ACTIVE_PRIVACY_CONSENT
      }
    ],
    QUERY.context
  );
  expect(decision).toMatchObject({
    decision: "CONSENT_PERMIT"
  });
});

it("active optin consent with blacklisted recipient actor", async () => {
  setupMockOrganization(
    `/${_.get(BASE_CONSENT, "provision.actor[0].reference.reference")}`,
    ORGANIZATION
  );

  const decision = await processDecision(
    [
      {
        fullUrl: `${CONSENT_FHIR_SERVERS[0]}/Consent/1`,
        resource: ACTIVE_PRIVACY_CONSENT
      }
    ],
    {
      patientId: {
        system: "http://hl7.org/fhir/sid/us-medicare",
        value: "0000-000-0000"
      },
      scope: "patient-privacy",
      purposeOfUse: "TREAT",
      actor: [ORGANIZATION.identifier[0]]
    }
  );
  expect(decision).toMatchObject({
    decision: "CONSENT_DENY"
  });
});

it("active optin consent with blacklisted recipient actor based on one of the multiple identifiers", async () => {
  setupMockOrganization(
    `/${_.get(BASE_CONSENT, "provision.actor[0].reference.reference")}`,
    ORGANIZATION
  );

  const decision = await processDecision(
    [
      {
        fullUrl: `${CONSENT_FHIR_SERVERS[0]}/Consent/1`,
        resource: ACTIVE_PRIVACY_CONSENT
      }
    ],
    {
      patientId: {
        system: "http://hl7.org/fhir/sid/us-medicare",
        value: "0000-000-0000"
      },
      scope: "patient-privacy",
      purposeOfUse: "TREAT",
      actor: [
        ORGANIZATION.identifier[0],
        { system: "some-other-system", value: "some-other-value" }
      ]
    }
  );
  expect(decision).toMatchObject({
    decision: "CONSENT_DENY"
  });
});

it("active optin consent with blacklisted purpose of use", async () => {
  const CONSENT_WITH_POU_PROVISION = _.cloneDeep(BASE_CONSENT);
  _.unset(CONSENT_WITH_POU_PROVISION, "provision.actor");
  _.set(CONSENT_WITH_POU_PROVISION, "provision.purpose", [
    {
      system: PURPOSE_OF_USE_SYSTEM,
      code: "HMARKT"
    }
  ]);

  const decision = await processDecision(
    [
      {
        fullUrl: `${CONSENT_FHIR_SERVERS[0]}/Consent/1`,
        resource: CONSENT_WITH_POU_PROVISION
      }
    ],
    {
      patientId: {
        system: "http://hl7.org/fhir/sid/us-medicare",
        value: "0000-000-0000"
      },
      scope: "patient-privacy",
      purposeOfUse: "HMARKT",
      actor: ORGANIZATION.identifier[0]
    }
  );
  expect(decision).toMatchObject({
    decision: "CONSENT_DENY"
  });
});

it("no active optin consent", async () => {
  setupMockOrganization(
    `/${_.get(BASE_CONSENT, "provision.actor[0].reference.reference")}`,
    ORGANIZATION
  );

  const decision = await processDecision(
    [
      {
        fullUrl: `${CONSENT_FHIR_SERVERS[0]}/Consent/1`,
        resource: INACTIVE_PRIVACY_CONSENT
      }
    ],
    QUERY.context
  );
  expect(decision).toMatchObject({
    decision: "NO_CONSENT"
  });
});

it("active optin consent with different scope", async () => {
  setupMockOrganization(
    `/${_.get(BASE_CONSENT, "provision.actor[0].reference.reference")}`,
    ORGANIZATION
  );

  const decision = await processDecision(
    [
      {
        fullUrl: `${CONSENT_FHIR_SERVERS[0]}/Consent/1`,
        resource: ACTIVE_RESEARCH_CONSENT
      }
    ],
    QUERY.context
  );
  expect(decision).toMatchObject({
    decision: "NO_CONSENT"
  });
});

it("more recent consent takes precedence", async () => {
  setupMockOrganization(
    `/${_.get(BASE_CONSENT, "provision.actor[0].reference.reference")}`,
    ORGANIZATION
  );

  const decision = await processDecision(
    [
      {
        fullUrl: `${CONSENT_FHIR_SERVERS[0]}/Consent/1`,
        resource: ACTIVE_PRIVACY_CONSENT
      },
      {
        fullUrl: `${CONSENT_FHIR_SERVERS[0]}/Consent/2`,
        resource: OLDER_ACTIVE_PRIVACY_OPTOUT_CONSENT
      }
    ],
    QUERY.context
  );
  expect(decision).toMatchObject({
    decision: "CONSENT_PERMIT"
  });
});
