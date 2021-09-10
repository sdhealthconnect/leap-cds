const { validateHookRequest } = require("../lib/validators");
const { asCard } = require("../lib/consent-decision-card");
const { processDecision } = require("../lib/consent-processor");
const { fetchConsents } = require("../lib/consent-discovery");
const logger = require("../lib/logger");

async function post(req, res, next) {
  try {
    validateHookRequest(req);

    const patientIds = req.body.context.patientId;
    const category = req.body.context.category || "";

    const consentsBundle = await fetchConsents(patientIds, category);
    const decisionEntry = await processDecision(
      consentsBundle,
      req.body.context
    );

    logger.debug(
      `Request: ${req.body.hookInstance}, Consents: ${consentsBundle.map(
        consent => consent.fullUrl
      )}, Decision: ${JSON.stringify(decisionEntry)}`
    );

    res.send({
      cards: [asCard(decisionEntry)]
    });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  post
};
