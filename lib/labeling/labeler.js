const { JSONPath } = require("jsonpath-plus");
const { removeRedundantCodes, codesShortHand, ALIASES } = require("../codes");

const RAW_SENSITIVITY_TAGGING_RULES = JSON.parse(
  process.env.SENSITIVITY_TAGGING_RULES || "[]"
);

const SENSITIVITY_RULES = RAW_SENSITIVITY_TAGGING_RULES.map((rule) => ({
  ...rule,
  codes: rule.codeSets.map((codeSet) => codeSet.codes).flat()
}));

const CONFIDENTIALITY_RULES = JSON.parse(
  process.env.CONFIDENTIALITY_TAGGING_RULES || "[]"
);

const labelBundle = (bundle) => ({
  ...bundle,
  entry: bundle.entry.map((entry) => ({
    ...entry,
    resource: labelResource(entry.resource)
  }))
});

const labelResource = (resource) =>
  labelResourceConfidentiality(labelResourceSensitivity(resource));

function labelResourceConfidentiality(resource) {
  const sensitivityLabels = codesShortHand(resource.meta?.security || []);
  const applicableRules = CONFIDENTIALITY_RULES.filter((rule) =>
    rule.codes.some((code) => sensitivityLabels.includes(code))
  );
  const labels = applicableRules
    .map((rule) =>
      rule.labels.map((label) => ({
        ...label,
        ...(rule.basis && { extension: basisExtension(rule.basis) })
      }))
    )
    .flat();
  return addUniqueLabelsToResource(resource, labels);
}

function addUniqueLabelsToResource(resource, labels) {
  const existingLabels = resource.meta?.security || [];
  const allLabels = removeRedundantCodes([...labels, ...existingLabels]);
  return {
    ...resource,
    meta: {
      ...(resource.meta || {}),
      security: allLabels
    }
  };
}

function labelResourceSensitivity(resource) {
  const clinicalCodes = JSONPath({ path: "$..coding", json: resource }).flat();
  const canonicalCodes = codesShortHand(clinicalCodes);
  const applicableRules = SENSITIVITY_RULES.filter((rule) =>
    rule.codes.some((code) => canonicalCodes.includes(code))
  );
  const labels = applicableRules
    .map((rule) =>
      rule.labels.map((label) => ({
        ...label,
        ...(rule.basis && { extension: basisExtension(rule.basis) })
      }))
    )
    .flat();
  return addUniqueLabelsToResource(resource, labels);
}

const basisExtension = (basisCoding) => [
  {
    url: "http://hl7.org/fhir/uv/security-label-ds4p/StructureDefinition/extension-sec-label-basis",
    valueCoding: basisCoding
  }
];

module.exports = {
  labelResource,
  labelBundle
};
