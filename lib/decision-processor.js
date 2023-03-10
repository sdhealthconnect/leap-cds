const { CONSENT_PERMIT } = require("./consent-decisions");
const { maybeRedactBundle } = require("./redacter");
const { labelBundle } = require("./labeling/labeler");

const maybeApplyDecision = (decisionEntry, content) => {
  return content && decisionEntry.decision === CONSENT_PERMIT
    ? {
        ...decisionEntry,
        content: maybeRedactBundle(
          decisionEntry.obligations,
          labelBundle(content)
        )
      }
    : decisionEntry;
};
module.exports = { maybeApplyDecision };
