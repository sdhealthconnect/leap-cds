const _ = require("lodash");
const { validateXacmlRequest } = require("../lib/validators");
const { asCard } = require("../lib/consent-decision-card");
const { processDecision } = require("../lib/consent-processor");
const { fetchConsents } = require("../lib/consent-discovery");
const logger = require("../lib/logger");

async function post(req, res, next) {
  try {
    validateXacmlRequest(req);

    const context = xacmlRequestToContext(req.body);

    const consentsBundle = await fetchConsents(
      context.patientId,
      context.scope
    );
    const decisionEntry = await processDecision(consentsBundle, context);

    logger.debug(
      `Request: , Consents: ${consentsBundle.map(
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

function attributeValueFromArray(attributeArray, attributeId) {
  const theAttribute = attributeArray.filter(
    attribute => attribute.AttributeId === attributeId
  );
  return _.get(theAttribute, "[0].Value");
}

function xacmlRequestToContext(xacmlRequest) {
  const patientId = attributeValueFromArray(
    _.get(xacmlRequest, "Request.Resource[0].Attribute"),
    "patientId"
  );

  const scope = attributeValueFromArray(
    _.get(xacmlRequest, "Request.Action[0].Attribute"),
    "scope"
  );

  const purposeOfUse = attributeValueFromArray(
    _.get(xacmlRequest, "Request.Action[0].Attribute"),
    "purposeOfUse"
  );

  const actor = attributeValueFromArray(
    _.get(xacmlRequest, "Request.AccessSubject[0].Attribute"),
    "actor"
  );

  return {
    patientId,
    scope,
    actor,
    purposeOfUse
  };
}

module.exports = {
  post
};
