const POLICY_RULE = {
  OPTOUT: {
    system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
    code: "OPTOUT"
  },
  OPTIN: {
    system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
    code: "OPTIN"
  }
};

const CONSENT_SCOPE_SYSTEM =
  "http://terminology.hl7.org/CodeSystem/consentscope";

const CONTENT_CLASS_SYSTEMS = [
  "http://ihe.net/fhir/ValueSet/IHE.FormatCode.codesystem",
  "http://hl7.org/fhir/resource-types",
  "urn:ietf:rfc:3986",
  "urn:ietf:bcp:13"
];

const CONSENT_SCOPE = {
  PATIENT_PRIVACY: {
    system: CONSENT_SCOPE_SYSTEM,
    code: "patient-privacy"
  },
  ADVANCED_CARE_DIRECTIVE: {
    system: CONSENT_SCOPE_SYSTEM,
    code: "adr"
  },
  RESEARCH: {
    system: CONSENT_SCOPE_SYSTEM,
    code: "research"
  },
  TREATMENT: {
    system: CONSENT_SCOPE_SYSTEM,
    code: "treatment"
  }
};

const PURPOSE_OF_USE_SYSTEM =
  "http://terminology.hl7.org/ValueSet/v3-PurposeOfUse";

const PROVISION_TYPE = {
  DENY: "deny",
  PERMIT: "permit"
};

const REDACT_CODE = {
  system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
  code: "REDACT"
};

const CONSENT_OBLIGATIONS = {
  CODES: {
    ONLY: labels => ({
      id: REDACT_CODE,
      parameters: {
        exceptAnyOfCodes: labels
      }
    }),
    EXCEPT: labels => ({
      id: REDACT_CODE,
      parameters: {
        codes: labels
      }
    })
  }
};

module.exports = {
  POLICY_RULE,
  CONSENT_SCOPE,
  CONSENT_SCOPE_SYSTEM,
  CONTENT_CLASS_SYSTEMS,
  PURPOSE_OF_USE_SYSTEM,
  PROVISION_TYPE,
  CONSENT_OBLIGATIONS,
  REDACT_CODE
};
