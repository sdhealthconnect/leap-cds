const resourcesToHookResponseUpdateAction = (resources) =>
  resources.map((resource) => ({
    type: "update",
    description: "labeled resource",
    resource: resource
  }));

const resourcesToHookResponse = (resources) => ({
  cards: [],
  systemActions: resourcesToHookResponseUpdateAction(resources)
});

module.exports = {
  resourcesToHookResponse
};
