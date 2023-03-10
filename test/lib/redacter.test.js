const _ = require("lodash");
const { labelBundle } = require("../../lib/labeling/labeler");
const { maybeRedactBundle } = require("../../lib/redacter");

const RESTRICTED_OBSERVATION = require("../fixtures/observations/observations-ketamine.json");
const NON_RESTRICTED_OBSERVATION = require("../fixtures/observations/observation-bacteria.json");
const BUNDLE = require("../fixtures/empty-bundle.json");
const OBLIGATIONS = [
  {
    id: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: "REDACT"
    },
    parameters: {
      codes: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality",
          code: "R"
        }
      ]
    }
  }
];

it("correctly redacts a bundle of resources", async () => {
  const bundleOfObservations = _.cloneDeep(BUNDLE);
  bundleOfObservations.entry = [
    { fullUrl: "1", resource: RESTRICTED_OBSERVATION },
    { fullUrl: "2", resource: NON_RESTRICTED_OBSERVATION }
  ];
  bundleOfObservations.total = 2;

  const labeledBundle = labelBundle(bundleOfObservations);
  const modifiedBundle = maybeRedactBundle(OBLIGATIONS, labeledBundle);

  expect(modifiedBundle.total).toBe(1);
  expect(modifiedBundle.entry).toHaveLength(1);
});
