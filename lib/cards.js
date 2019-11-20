const NO_CONSENT_CARD = {
  summary: "NO_CONSENT",
  detail: "No applicable consent was found.",
  indicator: "warning",
  source: {
    label: process.env.ORG_NAME,
    url: process.env.ORG_URL
  }
};

module.exports = {
  NO_CONSENT_CARD
};
