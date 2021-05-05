const _ = require("lodash");
const superagent = require("superagent");
const { CONSENT_PERMIT, CONSENT_DENY } = require("./consent-decisions");

const logger = require("./logger");

const auditEventTemplate = require("../template-resources/audit-event.json");

const CONSENT_FHIR_SERVERS = (process.env.CONSENT_FHIR_SERVERS || "")
  .split(",")
  .map(res => res.trim());

function constructAuditEventResource(decision, query) {
  const auditEvent = _.cloneDeep(auditEventTemplate);
  auditEvent.outcomeDesc = decision.decision;
  auditEvent.agent[0].who.identifier = query.actor[0];

  const patientEntity = {
    what: {
      reference: decision.patientId
    }
  };

  const consentEntity = {
    what: {
      reference: decision.id
    }
  };

  auditEvent.entity[0] = patientEntity;
  auditEvent.entity[1] = consentEntity;
}

function getFhirBase(consentFullUrl) {
  return _.first(
    CONSENT_FHIR_SERVERS.filter(base => consentFullUrl.startsWith(base))
  );
}

async function recordAudit(decision, query) {
  const auditEventResource = constructAuditEventResource(decision, query);
  const fhirBase = getFhirBase(decision.fullId);
  try {
    await superagent.post(`${fhirBase}/AuditEvent`).send(auditEventResource);
  } catch (e) {
    logger.warn(`Failed to create AuditEvent at ${fhirBase}/AuditEvent: ${e}`);
  }
}

async function maybeRecordAudit(decision, query) {
  if (
    decision.decision === CONSENT_PERMIT ||
    decision.decision === CONSENT_DENY
  ) {
    await recordAudit(decision, query);
  }
}

module.exports = {
  maybeRecordAudit
};
