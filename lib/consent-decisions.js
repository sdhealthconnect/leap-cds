const _ = require("lodash");

const CONSENT_PERMIT = "CONSENT_PERMIT";
const CONSENT_DENY = "CONSENT_DENY";
const NO_CONSENT = "NO_CONSENT";

const ORG_NAME = process.env.ORG_NAME;
const ORG_URL = process.env.ORG_URL;

const NO_CONSENT_CARD = {
  summary: NO_CONSENT,
  detail: "No applicable consent was found.",
  indicator: "warning",
  source: {
    label: ORG_NAME,
    url: ORG_URL
  },
  extension: {
    Decision: "NotApplicable"
  }
};

const CONSENT_PERMIT_CARD = {
  summary: CONSENT_PERMIT,
  detail: "There is a patient consent permitting this action.",
  indicator: "info",
  source: {
    label: ORG_NAME,
    url: ORG_URL
  },
  extension: {
    Decision: "Permit",
    Obligations: []
  }
};

const CONSENT_DENY_CARD = {
  summary: CONSENT_DENY,
  detail: "There is a patient consent denying this action.",
  indicator: "critical",
  source: {
    label: ORG_NAME,
    url: ORG_URL
  },
  extension: {
    Decision: "Deny"
  }
};

const decisionToCardMap = {
  NO_CONSENT: NO_CONSENT_CARD,
  CONSENT_PERMIT: CONSENT_PERMIT_CARD,
  CONSENT_DENY: CONSENT_DENY_CARD
};

function asCard(consentDecision) {
  return _.get(decisionToCardMap, consentDecision);
}

module.exports = {
  CONSENT_PERMIT,
  CONSENT_DENY,
  NO_CONSENT,
  NO_CONSENT_CARD,
  CONSENT_PERMIT_CARD,
  CONSENT_DENY_CARD,
  asCard
};
