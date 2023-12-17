const { validateHookRequest } = require("../lib/validators");
const { asCard } = require("../lib/consent-decision-card");
const { processDecision } = require("../lib/consent-processor");
const { fetchConsents } = require("../lib/consent-discovery");
const { maybeApplyDecision } = require("../lib/decision-processor");
const logger = require("../lib/logger");

async function post(req, res, next) {
  try {
    validateHookRequest(req);

    const patientIds = req.body.context.patientId;
    const category = req.body.context.category || [];
    const content = req.body.context.content;

    const consentsBundle = await fetchConsents(patientIds, category);
    const decisionEntry = await processDecision(
      consentsBundle,
      req.body.context
    );

    const revisedEntry = maybeApplyDecision(decisionEntry, content);

    logger.debug(
      `Request: ${req.body.hookInstance}, Consents: ${consentsBundle.map(
        ({ fullUrl }) => fullUrl
      )}, Decision: ${JSON.stringify(revisedEntry)}`
    );

    res.send({
      cards: [asCard(revisedEntry)]
    });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  post
};
