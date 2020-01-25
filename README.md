# LEAP-CDS
LEAP Consent Decision Service

# CDS Hook Interface
The Consent Decision Service provides an interface based on the specifications for [Clinical Decision Support (CDS) Hooks](https://cds-hooks.org/). Following these specifications, a client can query about the patient consent in various contexts including clinical workflows using a rich and flexible interface.

The CDS hook is named `patient-consent-consult` and, following the CDS Hooks specifications, it resides at the following endpoint:
```
/cds-services/patient-consent-consult
```

A `POST` request to this endpoint must have a body similar to the following example:
```json
{
  "hook": "patient-consent-consult",
  "hookInstance": "...",
  "context": {
    "patientId": {
        "system": "http://hl7.org/fhir/sid/us-medicare",
        "value": "0000-000-0000"
    },
    "scope" : "adr",
    "purposeOfUse": "TREAT",
    "actor": [
      {
        "system": "sample-system",
        "value": "sample-id"
      }
    ]
  }
}
```
The `hook` attribute must be set to `patient-consent-consult` and the hook instance must be set to a UUID identifying the request. These are requirements of the CDS Hooks specifications and currently have no effects in the behaviour of the Consent Decision Service.

The `context` attribute must be present and record the context of the query. The following attributes are part of the `context`:

| Attribute                   | Description                  | 
| :---                       |     :---                        | 
| `scope` _(required)_       | The broad context for the query in order to narrow down the applicable consent type. The values are based on FHIR [consent scope](https://www.hl7.org/fhir/valueset-consent-scope.html).                  | 
| `patientId` _(required)_   | Identity of the patient specified by a [`system`](https://www.hl7.org/fhir/identifier-registry.html) and `value` pair. This identifier is used to look up the patient's consent.                    | 
| `actor`                    | An array containing different identifiers of the actor involved in the context of the query (e.g., recipient organization or the clinician engaged in the workflow). Consents could match based on any of these identifiers. This will allow matching even if different FHIR servers know the actor by different identifiers.     |
| `purposeOfUse`             | purpose of use                  | 

The response is similar to the following:

```json
{
  "cards": [
    {
      "summary": "NO_CONSENT",
      "detail": "No applicable consent was found.",
      "indicator": "warning",
      "source": {
        "label": "Sample Consent Decision Management Service",
        "url": "https://sample-cdms.org"
      },
      "extension": {
        "Decision" : "NotApplicable"
      }
    }
  ]
}
```
Based on the CDS Hooks specifications, the response is in the form of an array of `card` objects each of which indicates some feedback from the server. Currently, the Consent Decision Service returns only a single `card`. The mandatory `source` attribute is currently set to carry the name and URL of the service directly defined as environment variables.

The `summary` is set to one of the following according to the consent decision:

| Value                   | Description                                     |
| :---                    |     :---                                        |
| `NO_CONSENT`            | No applicable consent to the context was found (even though the patient may have consents partially matching the request `context`). The `indicator` attribute is set to `warning` in this case.|
| `CONSENT_PERMIT`        | Patient consent permits the current request.  The `indicator` attribute is set to `info` in this case.. |
| `CONSENT_DENY`          | Patient consent denies the current request. The `indicator` attribute is set to `critical` in this case.. |

The `extension` attribute in the `card` object contains an XACML Response Object according to the [JSON Profile of XACML](https://docs.oasis-open.org/xacml/xacml-json-http/v1.1/os/xacml-json-http-v1.1-os.html#_Toc5116223) with the following attributes: 

| Attribute                   | Description          | 
| :---             |     :---             | 
| `Decision`       | `Permit`, `Deny`, or `NotApplicable` (for the case where no applicable consent is found).        |
|`Obligations`| An array of [`Obligation` objects](https://docs.oasis-open.org/xacml/xacml-json-http/v1.1/os/xacml-json-http-v1.1-os.html#_Toc5116231)  conveying additional requirements to be followed by the client.|



# Set Up 

## Local Set Up for Development
In order to set up this project for development, you need to have `node.js` and `yarn` installed on your system. 

1. Copy `.env.example` to `.evn` and adjust values according to your local setup.
2. Copy `.env.test.example` to `.env.test` and adjust values according to your local setup.
3. Get the dependencies:
```
$ yarn
```
4. To run the tests call:
```
$ yarn test
```
5. Run the LEAP-CDS service:
```
$ yarn start
```
