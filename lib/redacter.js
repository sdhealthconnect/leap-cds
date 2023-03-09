const { codeEquals, codesIntersection } = require("./codes");

const REDACT_OBLIGATION = {
  system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
  code: "REDACT"
};

function maybeRedactBundle(obligations, bundle) {
  const entries = bundle.entry || [];
  const updatedEntries = entries.filter(
    (entry) => !mustRedactResource(obligations, entry.resource)
  );
  return {
    ...bundle,
    entry: updatedEntries,
    ...(bundle.total && { total: updatedEntries.length })
  };
}

function mustRedactResource(obligations, resource) {
  return obligations.some(
    (obligation) =>
      redactBecauseOfSecurityLabel(obligation, resource) ||
      redactBecauseOfResourceType(obligation, resource)
  );
}

function redactBecauseOfSecurityLabel(obligation, resource) {
  if (!codeEquals(REDACT_OBLIGATION, obligation.id)) return false;

  const resourceSecLabels = resource.meta?.security || [];
  const codes = obligation.parameters?.codes;
  const exceptAnyOfCodes = obligation.parameters?.exceptAnyOfCodes;  
  return (
    (codes && codesIntersection(codes, resourceSecLabels).length) ||
    (exceptAnyOfCodes &&
      !codesIntersection(exceptAnyOfCodes, resourceSecLabels).length)
  );
}

function redactBecauseOfResourceType(obligation, resource) {
  const codes = obligation.parameters?.codes || [];
  const contentClassCodes = codes.filter(
    (code) => code.system === "http://hl7.org/fhir/resource-types"
  );

  return contentClassCodes.some(
    (contentClassCode) => contentClassCode.code === resource.resourceType
  );
}

module.exports = {
  maybeRedactBundle
};
