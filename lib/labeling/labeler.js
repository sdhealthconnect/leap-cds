const { JSONPath } = require("jsonpath-plus");
const { removeRedundantCodes, codesShortHand } = require("../codes");
const BASE_SENSITIVITY_RULES = require("./sensitivity-rules.json");
const BASE_CONFIDENTIALITY_RULES = require("./confidentiality-rules.json");

const SENSITIVITY_RULES = [
  ...BASE_SENSITIVITY_RULES,
  ...JSON.parse(process.env.SENSITIVITY_TAGGING_RULES || "[]")
];

const CONFIDENTIALITY_RULES = [
  ...BASE_CONFIDENTIALITY_RULES,
  ...JSON.parse(process.env.CONFIDENTIALITY_TAGGING_RULES || "[]")
];

const labelBundle = (bundle) => ({
  ...bundle,
  entry: bundle.entry.map((entry) => ({
    ...entry,
    resource: sanitizeResource(labelResource(entry.resource))
  }))
});

/**
 * remove the 'updated' attribute used to track which resources were update in the course of labeling.
 */
function sanitizeResource(resource) {
  const { updated, ...rest } = resource;
  return rest;
}

const labelBundleDiff = (bundle) =>
  bundle.entry
    .map(({ resource }) => labelResource(resource))
    .filter((resource) => resource.updated)
    .map((resource) => sanitizeResource(resource));

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
  return addUniqueLabelsToResource(
    { ...resource, updated: applicableRules.length > 0 },
    labels
  );
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

function applicableSensitivityRules(resource) {
  const clinicalCodes = JSONPath({ path: "$..coding", json: resource }).flat();
  const canonicalCodes = codesShortHand(clinicalCodes);
  return SENSITIVITY_RULES.map((rule) => ({
    ...rule,
    codeSets: rule.codeSets.filter(({ codes }) =>
      codes.some((code) => canonicalCodes.includes(code))
    )
  })).filter(({ codeSets }) => codeSets.length > 0);
}

function labelResourceSensitivity(resource) {
  const applicableRules = applicableSensitivityRules(resource);
  const labels = applicableRules
    .map(({ id, basis, labels, codeSets }) =>
      labels.map((label) => ({
        ...label,
        ...{
          extension: [
            ...basisExtension(basis),
            ...codeSets
              .map(({ groupId }) =>
                basisExtension({ system: id, code: groupId })
              )
              .flat()
          ]
        }
      }))
    )
    .flat();
  return addUniqueLabelsToResource(
    { ...resource, updated: applicableRules.length > 0 },
    labels
  );
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
    : sanitizeResource(labelResource(object));

module.exports = {
  labelBundle,
  labelBundleDiff,
  label
};
