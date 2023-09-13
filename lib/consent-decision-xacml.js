const _ = require("lodash");

const NOT_APPLICABLE_RESPONSE = {
  Response: [
    {
      Decision: "NotApplicable",
      Obligations: []
    }
  ]
};

const PERMIT_RESPONSE = {
  Response: [
    {
      Decision: "Permit",
      Obligations: []
    }
  ]
};

const DENY_RESPONSE = {
  Response: [
    {
      Decision: "Deny",
      Obligations: []
    }
  ]
};

const decisionToResponseMap = {
  NO_CONSENT: NOT_APPLICABLE_RESPONSE,
  CONSENT_PERMIT: PERMIT_RESPONSE,
  CONSENT_DENY: DENY_RESPONSE
};

function asXacmlResponse(consentDecision) {
  const response = _.cloneDeep(
    _.get(decisionToResponseMap, consentDecision.decision)
  );
  return _.set(
    response,
    "Response[0].Obligations",
    toXACMLObligations(consentDecision?.obligations)
  );
}

function toXACMLObligations(obligations) {
  if (!obligations) return [];
  return obligations.map((obligation) => toXACMLObligation(obligation));
}

function toXACMLObligation(obligation) {
  return {
    Id: obligation.id,
    AttributeAssignment: _.keys(obligation.parameters).map((parameterId) => ({
      AttributeId: parameterId,
      Value: _.get(obligation.parameters, parameterId)
    }))
  };
}

module.exports = {
  asXacmlResponse
};
