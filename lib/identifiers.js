const identifierEquals = (identifier1, identifier2) =>
  identifier1.value === identifier2.value &&
  identifier1.system === identifier2.system;

const identifiersInclude = (list, identifier) =>
  list.some((identifier1) => identifierEquals(identifier, identifier1));

function identifiersIntersection(identifiers1, identifiers2) {
  const firstIdentifiers = identifiers1 || [];
  const secondIdentifiers = identifiers2 || [];
  return firstIdentifiers.filter((identifier) =>
    identifiersInclude(secondIdentifiers, identifier)
  );
}

module.exports = {
  identifierEquals,
  identifiersIntersection
};
