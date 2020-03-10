const _ = require("lodash");

const {
  CONSENT_PERMIT,
  CONSENT_DENY,
  NO_CONSENT
} = require("./consent-decisions");

const ORG_NAME = process.env.ORG_NAME;
const ORG_URL = process.env.ORG_URL;

const NO_CONSENT_CARD = {
  summary: NO_CONSENT,
  detail: "No applicable consent was found.",
  indicator: "warning",
  source: {
    label: ORG_NAME,
    url: ORG_URL
  }
};

const CONSENT_PERMIT_CARD = {
  summary: CONSENT_PERMIT,
  detail: "There is a patient consent permitting this action.",
  indicator: "info",
  source: {
    label: ORG_NAME,
    url: ORG_URL
  }
};

const CONSENT_DENY_CARD = {
  summary: CONSENT_DENY,
  detail: "There is a patient consent denying this action.",
  indicator: "critical",
  source: {
    label: ORG_NAME,
    url: ORG_URL
  }
};

const decisionToCardMap = {
  NO_CONSENT: NO_CONSENT_CARD,
  CONSENT_PERMIT: CONSENT_PERMIT_CARD,
  CONSENT_DENY: CONSENT_DENY_CARD
};

function asCard(consentDecision) {
  const card = _.cloneDeep(_.get(decisionToCardMap, consentDecision.decision));
  card.extension = _.pick(consentDecision, ["decision", "obligations"]);
  return card;
}

module.exports = {
  NO_CONSENT_CARD,
  CONSENT_PERMIT_CARD,
  CONSENT_DENY_CARD,
  asCard
};
