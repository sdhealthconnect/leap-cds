const ALIASES = {
  "http://snomed.info/sct": "$SNOMED",
  "2.16.840.1.113883.6.96": "$SNOMED",

  "http://hl7.org/fhir/sid/icd-10": "$ICD10",
  "urn:oid:2.16.840.1.113883.6.3": "$ICD10",
  "http://id.who.int/icd/release/10/2019": "$ICD10",

  "http://www.nlm.nih.gov/research/umls/rxnorm": "$RXNORM",
  "2.16.840.1.113883.6.88": "$RXNORM",

  "http://terminology.hl7.org/CodeSystem/v3-ActCode": "$ACT-CODE"
};

const codeEquals = (coding1, coding2) =>
  coding1.code === coding2.code && coding1.system === coding2.system;

const removeRedundantCodes = (codes) =>
  codes.filter(
    (code, index) => codes.findIndex((c) => codeEquals(c, code)) === index
  );

const codeShortHand = (code) =>
  `${ALIASES[code?.system] || code?.system}#${code?.code?.trim?.()}`;

const codesShortHand = (codes) => codes.map((code) => codeShortHand(code));

function codesIntersection(codes1, codes2) {
  const codes2ShortHand = codesShortHand(codes2 || []);
  return (codes1 || []).filter((code1) =>
    codes2ShortHand.includes(codeShortHand(code1))
  );
}

const codesUnion = (codes1, codes2) =>
  removeRedundantCodes([...codes1, ...codes2]);

module.exports = {
  codeEquals,
  removeRedundantCodes,
  codesShortHand,
  codesIntersection,
  codesUnion,
  ALIASES
};
