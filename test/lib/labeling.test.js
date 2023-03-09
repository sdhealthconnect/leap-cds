const _ = require("lodash");
const {
  processResource,
  processBundle
} = require("../../lib/labeling/labeler");

const OBSERVATION = require("../fixtures/observations/observations-ketamine.json");
const BUNDLE = require("../fixtures/empty-bundle.json");

it("correctly labels an unlabled resource based on sensitivity rules", async () => {
  const labeledObservation = processResource(OBSERVATION);
  expect(labeledObservation.meta?.security).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
        code: "ETH",
        display: "substance abuse information sensitivity"
      })
    ])
  );
});

it("does not add redundant labels to a resource with existing labels based on sensitivity rules", async () => {
  const alreadyLabeledObservation = _.cloneDeep(OBSERVATION);
  alreadyLabeledObservation.meta = {
    security: [
      {
        code: "ETH",
        system: "http://terminology.hl7.org/CodeSystem/v3-ActCode"
      }
    ]
  };

  const labeledObservation = processResource(alreadyLabeledObservation);
  expect(labeledObservation.meta?.security).toHaveLength(1);
  expect(labeledObservation.meta?.security).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
        code: "ETH"
      })
    ])
  );
});

it("correctly adds labels to a resource with existing labels based on sensitivity rules", async () => {
  const alreadyLabeledObservation = _.cloneDeep(OBSERVATION);
  alreadyLabeledObservation.meta = {
    security: [
      {
        code: "HRELIABLE",
        system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue"
      }
    ]
  };

  const labeledObservation = processResource(alreadyLabeledObservation);
  expect(labeledObservation.meta?.security).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
        code: "ETH"
      }),
      expect.objectContaining({
        system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue",
        code: "HRELIABLE"
      })
    ])
  );
});

it.only("correctly labels a bundle of resource based on sensitivity rules", async () => {
  const bundleOfObservations = _.cloneDeep(BUNDLE);
  bundleOfObservations.entry = [
    { fullUrl: "1", resource: OBSERVATION },
    { fullUrl: "2", resource: OBSERVATION }
  ];
  const labeledBundle = processBundle(bundleOfObservations);
  expect(labeledBundle.entry[0].resource.meta?.security).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
        code: "ETH"
      })
    ])
  );
  expect(labeledBundle.entry[1].resource.meta?.security).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
        code: "ETH"
      })
    ])
  );
});
