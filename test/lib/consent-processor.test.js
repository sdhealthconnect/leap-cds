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

const EXPIRED_PRIVACY_CONSENT = _.set(
  _.cloneDeep(BASE_CONSENT),
  "provision.period.end",
  new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
);

const NOT_YET_VALID_PRIVACY_CONSENT = _.set(
  _.cloneDeep(BASE_CONSENT),
  "provision.period.start",
  new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString()
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

const ACTIVE_PRIVACY_CONSENT_WITH_SEC_LABEL_PROVISION = _.set(
  _.cloneDeep(BASE_CONSENT),
  "provision.provision.securityLabel",
  [
    {
      system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality",
      code: "R"
    }
  ]
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
  expect.assertions(1);

  setupMockOrganization(
    `/${_.get(
      BASE_CONSENT,
      "provision.provision.actor[0].reference.reference"
    )}`,
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
    decision: "CONSENT_PERMIT",
    obligations: []
  });
});

it("active but expired or not yet valid optin consent", async () => {
  expect.assertions(2);

  setupMockOrganization(
    `/${_.get(
      BASE_CONSENT,
      "provision.provision.actor[0].reference.reference"
    )}`,
    ORGANIZATION
  );

  let decision = await processDecision(
    [
      {
        fullUrl: `${CONSENT_FHIR_SERVERS[0]}/Consent/1`,
        resource: EXPIRED_PRIVACY_CONSENT
      }
    ],
    QUERY.context
  );
  expect(decision).toMatchObject({
    decision: "NO_CONSENT"
  });

  decision = await processDecision(
    [
      {
        fullUrl: `${CONSENT_FHIR_SERVERS[0]}/Consent/1`,
        resource: NOT_YET_VALID_PRIVACY_CONSENT
      }
    ],
    QUERY.context
  );
  expect(decision).toMatchObject({
    decision: "NO_CONSENT",
    obligations: []
  });
});

it("active optin consent with blacklisted recipient actor", async () => {
  expect.assertions(1);

  setupMockOrganization(
    `/${_.get(
      BASE_CONSENT,
      "provision.provision.actor[0].reference.reference"
    )}`,
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
    decision: "CONSENT_DENY",
    obligations: []
  });
});

it("active optin consent with blacklisted recipient actor based on one of the multiple identifiers", async () => {
  expect.assertions(1);

  setupMockOrganization(
    `/${_.get(
      BASE_CONSENT,
      "provision.provision.actor[0].reference.reference"
    )}`,
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
    decision: "CONSENT_DENY",
    obligations: []
  });
});

it("active optin consent with blacklisted purpose of use", async () => {
  expect.assertions(1);

  const CONSENT_WITH_POU_PROVISION = _.cloneDeep(BASE_CONSENT);
  _.unset(CONSENT_WITH_POU_PROVISION, "provision.provision.actor");
  _.set(CONSENT_WITH_POU_PROVISION, "provision.provision.purpose", [
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
    decision: "CONSENT_DENY",
    obligations: []
  });
});

it("active optin consent with security label provision", async () => {
  expect.assertions(1);

  setupMockOrganization(
    `/${_.get(
      ACTIVE_PRIVACY_CONSENT_WITH_SEC_LABEL_PROVISION,
      "provision.provision.actor[0].reference.reference"
    )}`,
    ORGANIZATION
  );

  const decision = await processDecision(
    [
      {
        fullUrl: `${CONSENT_FHIR_SERVERS[0]}/Consent/1`,
        resource: ACTIVE_PRIVACY_CONSENT_WITH_SEC_LABEL_PROVISION
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
    decision: "CONSENT_PERMIT",
    obligations: [
      {
        id: {
          system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
          code: "REDACT"
        },
        parameters: {
          labels: [
            {
              system:
                "http://terminology.hl7.org/CodeSystem/v3-Confidentiality",
              code: "R"
            }
          ]
        }
      }
    ]
  });
});

it("no active optin consent", async () => {
  expect.assertions(1);

  setupMockOrganization(
    `/${_.get(
      BASE_CONSENT,
      "provision.provision.actor[0].reference.reference"
    )}`,
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
    decision: "NO_CONSENT",
    obligations: []
  });
});

it("active optin consent with different scope", async () => {
  expect.assertions(1);

  setupMockOrganization(
    `/${_.get(
      BASE_CONSENT,
      "provision.provision.actor[0].reference.reference"
    )}`,
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
    decision: "NO_CONSENT",
    obligations: []
  });
});

it("more recent consent takes precedence", async () => {
  expect.assertions(1);

  setupMockOrganization(
    `/${_.get(
      BASE_CONSENT,
      "provision.provision.actor[0].reference.reference"
    )}`,
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
    decision: "CONSENT_PERMIT",
    obligations: []
  });
});
