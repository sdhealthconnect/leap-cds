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

module.exports = {
  POLICY_RULE,
  CONSENT_SCOPE,
  CONSENT_SCOPE_SYSTEM
};
