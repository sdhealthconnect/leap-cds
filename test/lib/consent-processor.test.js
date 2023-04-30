const _ = require("lodash");
const nock = require("nock");

const {
  setupMockOrganization,
  setupMockAuditEndpoint,
  CONSENT_FHIR_SERVERS
} = require("../common/setup-mock-consent-servers");

const { PURPOSE_OF_USE_SYSTEM } = require("../../lib/consent-valuesets");

const { processDecision } = require("../../lib/consent-processor");

const ORGANIZATION = require("../fixtures/organizations/org-good-health.json");

const BASE_CONSENT = require("../fixtures/consents/consent-boris-optin.json");
const ACTIVE_PRIVACY_CONSENT = BASE_CONSENT;
const ACTIVE_PRIVACY_CONSENT_WITH_SCOPE_IN_CATEGORY = require("../fixtures/consents/consent-boris-optin-with-scope-in-category.json");
const INACTIVE_PRIVACY_CONSENT = require("../fixtures/consents/consent-boris-inactive.json");
const EXPIRED_PRIVACY_CONSENT = require("../fixtures/consents/consent-boris-expired.json");
const CONSENT_DENY_PRACTITIONER = require("../fixtures/consents/consent-boris-deny-practitioner.json");
const ACTIVE_PRIVACY_CONSENT_WITH_CONTENT_CLASS_PROVISION = require("../fixtures/consents/consent-boris-deny-restricted-content-class");

const NOT_YET_VALID_PRIVACY_CONSENT = _.set(
  _.cloneDeep(BASE_CONSENT),
  "provision.period.start",
  new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString()
);

const ACTIVE_RESEARCH_CONSENT = require("../fixtures/consents/consent-boris-research.json");
const ACTIVE_PRIVACY_OPTOUT_CONSENT = require("../fixtures/consents/consent-boris-optout.json");
const ACTIVE_PRIVACY_CONSENT_WITH_SEC_LABEL_PROVISION = require("../fixtures/consents/consent-boris-deny-restricted-label.json");
const ACTIVE_PRIVACY_CONSENT_WITH_MULTIPLE_SEC_LABEL_PROVISION = require("../fixtures/consents/consent-boris-multiple-deny-labels.json");
const ACTIVE_PRIVACY_CONSENT_WITH_PROVISION_ARRAY = require("../fixtures/consents/consent-boris-provision-array.json");
const ACTIVE_PRIVACY_CONSENT_WITH_POU_IN_ROOT_ROVISION = require("../fixtures/consents/consent-boris-optin-with-pou-in-root-provision.json");

const OLDER_ACTIVE_PRIVACY_OPTOUT_CONSENT = _.set(
  _.cloneDeep(ACTIVE_PRIVACY_OPTOUT_CONSENT),
  "dateTime",
  "2010-11-01"
);

const QUERY = {
  hook: "patient-consent-consult",
  hookInstance: "1",
  context: {
    patientId: [
      {
        system: "http://hl7.org/fhir/sid/us-medicare",
        value: "0000-000-0000"
      }
    ],
    category: [
      {
        system: "http://terminology.hl7.org/CodeSystem/consentscope",
        code: "patient-privacy"
      }
    ],
    purposeOfUse: "TREAT",
    actor: [
      {
        system: "test-system",
        value: "test-value"
      }
    ]
  }
};

afterEach(() => {
  nock.cleanAll();
});

it("active optin consent", async () => {
  expect.assertions(1);
  setupMockAuditEndpoint();
  setupMockOrganization(
    `/${_.get(
      BASE_CONSENT,
      "provision.provision[0].actor[0].reference.reference"
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

it("active optin consent with no scope in query", async () => {
  expect.assertions(1);
  setupMockAuditEndpoint();
  setupMockOrganization(
    `/${_.get(
      BASE_CONSENT,
      "provision.provision[0].actor[0].reference.reference"
    )}`,
    ORGANIZATION
  );

  const queryContext = _.clone(QUERY.context);
  queryContext.scope = null;

  const decision = await processDecision(
    [
      {
        fullUrl: `${CONSENT_FHIR_SERVERS[0]}/Consent/1`,
        resource: ACTIVE_PRIVACY_CONSENT
      }
    ],
    queryContext
  );
  expect(decision).toMatchObject({
    decision: "CONSENT_PERMIT",
    obligations: []
  });
});

it("active optin consent with scope stored in category[0]", async () => {
  expect.assertions(1);
  setupMockAuditEndpoint();
  setupMockOrganization(
    `/${_.get(
      ACTIVE_PRIVACY_CONSENT_WITH_SCOPE_IN_CATEGORY,
      "provision.provision[0].actor[0].reference.reference"
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
      "provision.provision[0].actor[0].reference.reference"
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

  setupMockAuditEndpoint();
  setupMockOrganization(
    `/${_.get(
      BASE_CONSENT,
      "provision.provision[0].actor[0].reference.reference"
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
      category: [
        {
          system: "http://terminology.hl7.org/CodeSystem/consentscope",
          code: "patient-privacy"
        }
      ],
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

  setupMockAuditEndpoint();
  setupMockOrganization(
    `/${_.get(
      BASE_CONSENT,
      "provision.provision[0].actor[0].reference.reference"
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
      category: [
        {
          system: "http://terminology.hl7.org/CodeSystem/consentscope",
          code: "patient-privacy"
        }
      ],
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

it("active optin consent with blacklisted recipient actor of type practitioner", async () => {
  expect.assertions(1);

  setupMockAuditEndpoint();
  const PRACTITIONER = require("../fixtures/practitioner/practitioner-dr-bob.json");
  setupMockOrganization(
    `/${_.get(
      CONSENT_DENY_PRACTITIONER,
      "provision.provision[0].actor[0].reference.reference"
    )}`,
    PRACTITIONER
  );

  const decision = await processDecision(
    [
      {
        fullUrl: `${CONSENT_FHIR_SERVERS[0]}/Consent/1`,
        resource: CONSENT_DENY_PRACTITIONER
      }
    ],
    {
      patientId: {
        system: "http://hl7.org/fhir/sid/us-medicare",
        value: "0000-000-0000"
      },
      category: [
        {
          system: "http://terminology.hl7.org/CodeSystem/consentscope",
          code: "patient-privacy"
        }
      ],
      purposeOfUse: "TREAT",
      actor: [PRACTITIONER.identifier[0]]
    }
  );
  expect(decision).toMatchObject({
    decision: "CONSENT_DENY",
    obligations: []
  });
});

it("active optin consent with blacklisted purpose of use", async () => {
  expect.assertions(1);

  setupMockAuditEndpoint();

  const CONSENT_WITH_POU_PROVISION = _.cloneDeep(BASE_CONSENT);
  _.unset(CONSENT_WITH_POU_PROVISION, "provision.provision[0].actor");
  _.set(CONSENT_WITH_POU_PROVISION, "provision.provision[0].purpose", [
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
      category: [
        {
          system: "http://terminology.hl7.org/CodeSystem/consentscope",
          code: "patient-privacy"
        }
      ],
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

  setupMockAuditEndpoint();
  setupMockOrganization(
    `/${_.get(
      ACTIVE_PRIVACY_CONSENT_WITH_SEC_LABEL_PROVISION,
      "provision.provision[0].actor[0].reference.reference"
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
      category: [
        {
          system: "http://terminology.hl7.org/CodeSystem/consentscope",
          code: "patient-privacy"
        }
      ],
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
          codes: [
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

it("active optin consent with multiple security label provision", async () => {
  expect.assertions(1);

  setupMockAuditEndpoint();

  const decision = await processDecision(
    [
      {
        fullUrl: `${CONSENT_FHIR_SERVERS[0]}/Consent/1`,
        resource: ACTIVE_PRIVACY_CONSENT_WITH_MULTIPLE_SEC_LABEL_PROVISION
      }
    ],
    {
      patientId: {
        system: "http://hl7.org/fhir/sid/us-medicare",
        value: "0000-000-0000"
      },
      category: [
        {
          system: "http://terminology.hl7.org/CodeSystem/consentscope",
          code: "patient-privacy"
        }
      ],
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
          codes: [
            {
              system:
                "http://terminology.hl7.org/ValueSet/v3-InformationSensitivityPolicy",
              code: "ETHUD"
            },
            {
              system:
                "http://terminology.hl7.org/ValueSet/v3-InformationSensitivityPolicy",
              code: "HIV"
            }
          ]
        }
      }
    ]
  });
});

it("active optin consent with array of security label provisions", async () => {
  expect.assertions(2);

  setupMockAuditEndpoint();

  setupMockOrganization(
    `/${_.get(
      ACTIVE_PRIVACY_CONSENT_WITH_PROVISION_ARRAY,
      "provision.provision[0].actor[0].reference.reference"
    )}`,
    ORGANIZATION,
    2
  );

  const decision = await processDecision(
    [
      {
        fullUrl: `${CONSENT_FHIR_SERVERS[0]}/Consent/1`,
        resource: ACTIVE_PRIVACY_CONSENT_WITH_PROVISION_ARRAY
      }
    ],
    {
      patientId: {
        system: "http://hl7.org/fhir/sid/us-medicare",
        value: "0000-000-0000"
      },
      category: [
        {
          system: "http://terminology.hl7.org/CodeSystem/consentscope",
          code: "patient-privacy"
        }
      ],
      purposeOfUse: "TREAT",
      actor: [ORGANIZATION.identifier[0]]
    }
  );

  expect(decision.decision).toEqual("CONSENT_PERMIT");
  expect(decision.obligations).toEqual(
    expect.arrayContaining([
      {
        id: {
          system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
          code: "REDACT"
        },
        parameters: {
          codes: expect.arrayContaining([
            {
              system:
                "http://terminology.hl7.org/CodeSystem/v3-Confidentiality",
              code: "R"
            },
            {
              system:
                "http://terminology.hl7.org/CodeSystem/v3-Confidentiality",
              code: "V"
            }
          ])
        }
      }
    ])
  );
});

it("active optin consent with security label and content class provisions", async () => {
  expect.assertions(2);

  setupMockAuditEndpoint();

  setupMockOrganization(
    `/${_.get(
      ACTIVE_PRIVACY_CONSENT_WITH_CONTENT_CLASS_PROVISION,
      "provision.provision[0].actor[0].reference.reference"
    )}`,
    ORGANIZATION,
    2
  );

  const decision = await processDecision(
    [
      {
        fullUrl: `${CONSENT_FHIR_SERVERS[0]}/Consent/1`,
        resource: ACTIVE_PRIVACY_CONSENT_WITH_CONTENT_CLASS_PROVISION
      }
    ],
    {
      patientId: {
        system: "http://hl7.org/fhir/sid/us-medicare",
        value: "0000-000-0000"
      },
      category: [
        {
          system: "http://terminology.hl7.org/CodeSystem/consentscope",
          code: "patient-privacy"
        }
      ],
      purposeOfUse: "TREAT",
      actor: [ORGANIZATION.identifier[0]]
    }
  );

  expect(decision.decision).toEqual("CONSENT_PERMIT");
  expect(decision.obligations).toEqual(
    expect.arrayContaining([
      {
        id: {
          system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
          code: "REDACT"
        },
        parameters: {
          codes: [
            {
              system:
                "http://terminology.hl7.org/CodeSystem/v3-Confidentiality",
              code: "R"
            },
            {
              system: "http://hl7.org/fhir/resource-types",
              code: "MedicationStatement"
            }
          ]
        }
      }
    ])
  );
});

it("active optin consent with content class provisions and sec label with request including a class", async () => {
  expect.assertions(2);
  const ACTIVE_PRIVACY_CONSENT_WITH_CONTENT_CLASS_PROVISION_AND_SEC_LABEL = require("../fixtures/consents/consent-boris-deny-restricted-content-class-and-sec-label");

  setupMockAuditEndpoint();

  setupMockOrganization(
    `/${_.get(
      ACTIVE_PRIVACY_CONSENT_WITH_CONTENT_CLASS_PROVISION_AND_SEC_LABEL,
      "provision.provision[0].actor[0].reference.reference"
    )}`,
    ORGANIZATION,
    2
  );

  const decision = await processDecision(
    [
      {
        fullUrl: `${CONSENT_FHIR_SERVERS[0]}/Consent/1`,
        resource:
          ACTIVE_PRIVACY_CONSENT_WITH_CONTENT_CLASS_PROVISION_AND_SEC_LABEL
      }
    ],
    {
      patientId: {
        system: "http://hl7.org/fhir/sid/us-medicare",
        value: "0000-000-0000"
      },
      category: [
        {
          system: "http://terminology.hl7.org/CodeSystem/consentscope",
          code: "patient-privacy"
        }
      ],
      purposeOfUse: "TREAT",
      actor: [ORGANIZATION.identifier[0]],
      class: [
        {
          system: "http://hl7.org/fhir/resource-types",
          code: "Immunization"
        }
      ]
    }
  );

  expect(decision.decision).toEqual("CONSENT_PERMIT");
  expect(decision.obligations).toEqual(
    expect.arrayContaining([
      {
        id: {
          system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
          code: "REDACT"
        },
        parameters: {
          codes: [
            {
              system:
                "http://terminology.hl7.org/CodeSystem/v3-Confidentiality",
              code: "R"
            }
          ]
        }
      }
    ])
  );
});

it("active optin consent with content class provisions with request including a class", async () => {
  expect.assertions(2);
  const ACTIVE_PRIVACY_CONSENT_WITH_CONTENT_CLASS_PROVISION = require("../fixtures/consents/consent-boris-deny-restricted-content-class-only.json");

  setupMockAuditEndpoint();

  setupMockOrganization(
    `/${_.get(
      ACTIVE_PRIVACY_CONSENT_WITH_CONTENT_CLASS_PROVISION,
      "provision.provision[0].actor[0].reference.reference"
    )}`,
    ORGANIZATION,
    2
  );

  const decision = await processDecision(
    [
      {
        fullUrl: `${CONSENT_FHIR_SERVERS[0]}/Consent/1`,
        resource: ACTIVE_PRIVACY_CONSENT_WITH_CONTENT_CLASS_PROVISION
      }
    ],
    {
      patientId: {
        system: "http://hl7.org/fhir/sid/us-medicare",
        value: "0000-000-0000"
      },
      category: [
        {
          system: "http://terminology.hl7.org/CodeSystem/consentscope",
          code: "patient-privacy"
        }
      ],
      purposeOfUse: "TREAT",
      actor: [ORGANIZATION.identifier[0]],
      class: [
        {
          system: "http://hl7.org/fhir/resource-types",
          code: "MedicationStatement"
        }
      ]
    }
  );

  expect(decision.decision).toEqual("CONSENT_DENY");
  expect(decision.obligations).toEqual([]);
});

it("active optin consent with clinical code provisions", async () => {
  expect.assertions(2);
  const ACTIVE_PRIVACY_CONSENT_WITH_CLINICAL_CODE_PROVISION = require("../fixtures/consents/consent-boris-deny-restricted-clinical-code");

  setupMockAuditEndpoint();
  setupMockOrganization(
    `/${_.get(
      ACTIVE_PRIVACY_CONSENT_WITH_CLINICAL_CODE_PROVISION,
      "provision.provision[0].actor[0].reference.reference"
    )}`,
    ORGANIZATION,
    2
  );

  const decision = await processDecision(
    [
      {
        fullUrl: `${CONSENT_FHIR_SERVERS[0]}/Consent/1`,
        resource: ACTIVE_PRIVACY_CONSENT_WITH_CLINICAL_CODE_PROVISION
      }
    ],
    {
      patientId: {
        system: "http://hl7.org/fhir/sid/us-medicare",
        value: "0000-000-0000"
      },
      category: [
        {
          system: "http://terminology.hl7.org/CodeSystem/consentscope",
          code: "patient-privacy"
        }
      ],
      purposeOfUse: "TREAT",
      actor: [ORGANIZATION.identifier[0]]
    }
  );

  expect(decision.decision).toEqual("CONSENT_PERMIT");
  expect(decision.obligations).toEqual(
    expect.arrayContaining([
      {
        id: {
          system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
          code: "REDACT"
        },
        parameters: {
          codes: [
            {
              system: "http://loinc.org/",
              code: "42828-4"
            }
          ]
        }
      }
    ])
  );
});

it("active optin consent with array of provisions", async () => {
  expect.assertions(1);

  setupMockAuditEndpoint();
  setupMockOrganization(
    `/${_.get(
      ACTIVE_PRIVACY_CONSENT_WITH_PROVISION_ARRAY,
      "provision.provision[0].actor[0].reference.reference"
    )}`,
    ORGANIZATION,
    2
  );

  const decision = await processDecision(
    [
      {
        fullUrl: `${CONSENT_FHIR_SERVERS[0]}/Consent/1`,
        resource: ACTIVE_PRIVACY_CONSENT_WITH_PROVISION_ARRAY
      }
    ],
    {
      patientId: {
        system: "http://hl7.org/fhir/sid/us-medicare",
        value: "0000-000-0000"
      },
      category: [
        {
          system: "http://terminology.hl7.org/CodeSystem/consentscope",
          code: "patient-privacy"
        }
      ],
      purposeOfUse: "HMARKT",
      actor: [ORGANIZATION.identifier[0]]
    }
  );
  expect(decision).toMatchObject({ decision: "CONSENT_DENY" });
});

it("active optin consent with purpose in root provision not matching the request purpose of use", async () => {
  expect.assertions(1);

  setupMockAuditEndpoint();

  const decision = await processDecision(
    [
      {
        fullUrl: `${CONSENT_FHIR_SERVERS[0]}/Consent/1`,
        resource: ACTIVE_PRIVACY_CONSENT_WITH_POU_IN_ROOT_ROVISION
      }
    ],
    {
      patientId: {
        system: "http://hl7.org/fhir/sid/us-medicare",
        value: "0000-000-0000"
      },
      category: [
        {
          system: "http://terminology.hl7.org/CodeSystem/consentscope",
          code: "patient-privacy"
        }
      ],
      purposeOfUse: "HMARKT",
      actor: [ORGANIZATION.identifier[0]]
    }
  );
  expect(decision).toMatchObject({ decision: "NO_CONSENT" });
});

it("active optin consent with purpose in root provision matching the request purpose of use", async () => {
  expect.assertions(1);

  setupMockAuditEndpoint();

  const decision = await processDecision(
    [
      {
        fullUrl: `${CONSENT_FHIR_SERVERS[0]}/Consent/1`,
        resource: ACTIVE_PRIVACY_CONSENT_WITH_POU_IN_ROOT_ROVISION
      }
    ],
    {
      patientId: {
        system: "http://hl7.org/fhir/sid/us-medicare",
        value: "0000-000-0000"
      },
      category: [
        {
          system: "http://terminology.hl7.org/CodeSystem/consentscope",
          code: "patient-privacy"
        }
      ],
      purposeOfUse: "ETREAT",
      actor: [ORGANIZATION.identifier[0]]
    }
  );
  expect(decision).toMatchObject({ decision: "CONSENT_PERMIT" });
});

it("active optin consent with array of provisions matching some of the request purposes of use", async () => {
  expect.assertions(1);

  setupMockAuditEndpoint();

  const decision = await processDecision(
    [
      {
        fullUrl: `${CONSENT_FHIR_SERVERS[0]}/Consent/1`,
        resource: ACTIVE_PRIVACY_CONSENT_WITH_POU_IN_ROOT_ROVISION
      }
    ],
    {
      patientId: {
        system: "http://hl7.org/fhir/sid/us-medicare",
        value: "0000-000-0000"
      },
      category: [
        {
          system: "http://terminology.hl7.org/CodeSystem/consentscope",
          code: "patient-privacy"
        }
      ],
      purposeOfUse: ["ETREAT", "HMARKT"],
      actor: [ORGANIZATION.identifier[0]]
    }
  );
  expect(decision).toMatchObject({ decision: "CONSENT_PERMIT" });
});

it("no active optin consent", async () => {
  expect.assertions(1);

  setupMockOrganization(
    `/${_.get(
      BASE_CONSENT,
      "provision.provision[0].actor[0].reference.reference"
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
      "provision.provision[0].actor[0].reference.reference"
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
