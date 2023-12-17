const { codeEquals, codesIntersection } = require("./codes");

const REDACT_OBLIGATION = {
  system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
  code: "REDACT"
};

const FHIR_RESOURCE_TYPE = "http://hl7.org/fhir/resource-types";

function maybeRedactBundle(obligations, bundle) {
  const redactObligations = obligations.filter((obligation) =>
    codeEquals(REDACT_OBLIGATION, obligation.id)
  );
  if (!redactObligations.length) return bundle;

  const entries = bundle.entry || [];
  const updatedEntries = entries.filter(
    (entry) => !mustRedactResource(redactObligations, entry.resource)
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
    (code) => code.system === FHIR_RESOURCE_TYPE
  );

  return contentClassCodes.some(
    (contentClassCode) => contentClassCode.code === resource.resourceType
  );
}

module.exports = {
  maybeRedactBundle
};
