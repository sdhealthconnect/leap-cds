const { JSONPath } = require("jsonpath-plus");
const ALIASES = require("./aliases.json");

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

const processBundle = (bundle) => ({
  ...bundle,
  entry: bundle.entry.map((entry) => ({
    ...entry,
    resource: processResource(entry.resource)
  }))
});

const processResource = (resource) =>
  processResourceConfidentiality(processResourceSensitivity(resource));

function processResourceConfidentiality(resource) {
  const sensitivityLabels = resource.meta?.security || [];
  const canonicalCodes = sensitivityLabels.map(
    (code) => `${ALIASES[code.system] || code.system}#${code.code}`
  );
  const applicableRules = CONFIDENTIALITY_RULES.filter((rule) =>
    rule.codes.filter((code) => canonicalCodes.includes(code))
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

function processResourceSensitivity(resource) {
  const clinicalCodes = JSONPath({ path: "$..coding", json: resource }).flat();
  const canonicalCodes = clinicalCodes.map(
    (code) => `${ALIASES[code.system] || code.system}#${code.code}`
  );
  const applicableRules = SENSITIVITY_RULES.filter((rule) =>
    rule.codes.filter((code) => canonicalCodes.includes(code))
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

const basisExtension = (basisCoding) =>
  basisCoding
    ? [
        {
          url: "http://hl7.org/fhir/uv/security-label-ds4p/StructureDefinition/extension-sec-label-basis",
          valueCoding: basisCoding
        }
      ]
    : [];

const removeRedundantCodes = (codes) =>
  codes.filter(
    (code, index) => codes.findIndex((c) => codeEquals(c, code)) === index
  );

const codeEquals = (coding1, coding2) =>
  coding1.code === coding2.code && coding1.system === coding2.system;

module.exports = {
  processResource,
  processBundle
};
