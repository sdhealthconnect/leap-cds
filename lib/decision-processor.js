const { CONSENT_PERMIT } = require("./consent-decisions");
const { maybeRedactBundle } = require("./redacter");
const { label } = require("./labeling/labeler");

const maybeApplyDecision = (decisionEntry, content) => {
  return content && decisionEntry.decision === CONSENT_PERMIT
    ? {
        ...decisionEntry,
        content: maybeRedactBundle(
          decisionEntry.obligations,
          label(content)
        )
      }
    : decisionEntry;
};
module.exports = { maybeApplyDecision };
