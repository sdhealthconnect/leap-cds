const { JSONPath } = require("jsonpath-plus");
const { removeRedundantCodes, codesShortHand } = require("../codes");
const BASE_SENSITIVITY_RULES = require("./sensitivity-rules.json");
const BASE_CONFIDENTIALITY_RULES = require("./confidentiality-rules.json");

const SENSITIVITY_RULES = [
  ...BASE_SENSITIVITY_RULES,
  ...JSON.parse(process.env.SENSITIVITY_TAGGING_RULES || "[]")
];

// const SENSITIVITY_RULES = RAW_SENSITIVITY_TAGGING_RULES.map((rule) => ({
//   ...rule,
//   codes: rule.codeSets.map(({ codes }) => codes).flat()
// }));

const CONFIDENTIALITY_RULES = [
  ...BASE_CONFIDENTIALITY_RULES,
  ...JSON.parse(process.env.CONFIDENTIALITY_TAGGING_RULES || "[]")
];

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
    .map(({ labels, basis }) =>
      labels.map((label) => ({
        ...label,
        ...(basis && { extension: basisExtension(basis) })
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
  const applicableRules = SENSITIVITY_RULES.map((rule) => ({
    ...rule,
    codeSets: rule.codeSets.filter(({ codes }) =>
      codes.some((code) => canonicalCodes.includes(code))
    )
  })).filter(({codeSets}) => codeSets.length > 0);

  const labels = applicableRules
    .map(({ id, basis, labels, codeSets }) =>
      labels.map((label) => ({
        ...label,
        ...{
          extension: [
            ...basisExtension(basis),
            ...codeSets.map(({ groupId }) => basisExtension({ system: id, code: groupId })).flat()
          ]
        }
      }))
    )
    .flat();
  return addUniqueLabelsToResource(resource, labels);
}

const SEC_LABEL_BASIS_URL =
  "http://hl7.org/fhir/uv/security-label-ds4p/StructureDefinition/extension-sec-label-basis";

const basisExtension = (basisCoding) =>
  basisCoding
    ? [
        {
          url: SEC_LABEL_BASIS_URL,
          valueCoding: basisCoding
        }
      ]
    : [];

const label = (object) =>
  object?.resourceType == "Bundle"
    ? labelBundle(object)
    : labelResource(object);

module.exports = {
  labelResource,
  labelBundle,
  label
};
