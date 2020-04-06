# LEAP-CDS
LEAP Consent Decision Service is a service that enables clients to query patient consent policies applicable to a particular workflow or exchange context and determine whether the action in question is authorized by the patient consent.

# API
LEAP CDS provides two API endpoints interfacing to this service:

- The CDS Hook interface is based on the specifications for [Clinical Decision Support (CDS) Hooks](https://cds-hooks.org/).
- The XACML interface is based on the [JSON Profile of XACML](https://docs.oasis-open.org/xacml/xacml-json-http/v1.1/os/xacml-json-http-v1.1-os.html#_Toc5116223). 

## CDS Hook Interface
The CDS Hook interface is based on the specifications for [Clinical Decision Support (CDS) Hooks](https://cds-hooks.org/). The CDS hook is named `patient-consent-consult` and, following the CDS Hooks specifications, it resides at the following endpoint:

```
/cds-services/patient-consent-consult
```

### Request
A `POST` request to this endpoint must have the header `Content-Type` set to `application/json` and have a body similar to the following example:

```json
{
  "hook": "patient-consent-consult",
  "hookInstance": "hook-instance-123",
  "context": {
    "patientId": [
      {
        "system": "http://hl7.org/fhir/sid/us-medicare",
        "value": "0000-000-0000"
      }
    ],
    "scope" : "patient-privacy",
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
The `hook` attribute must be set to the hook name, which in this case is `patient-consent-consult`. The hook instance must be set to a unique value identifying the request (these are the requirements from the CDS Hooks specifications and currently have no effects in the behaviour of the Consent Decision Service).

The `context` attribute must be present and record the context of the query using the following attributes:

| Attribute                   | Description                  | 
| :---                       |     :---                        | 
| `scope` _(required)_       | The broad context for the query in order to narrow down the applicable consent type. The values are based on FHIR [consent scope](https://www.hl7.org/fhir/valueset-consent-scope.html), namely: `adr` (advanced care directive), `research`, `patient-privacy`, and `treatment`.                  | 
| `actor` _(required)_                   | An array containing different identifiers of the actor involved in the context of the query (e.g., recipient organization or the clinician engaged in the workflow). Consents could match based on any of these identifiers. This allows identifying the actor even if different FHIR servers know the actor by different identifiers.     |
| `patientId` _(required)_   | An array containing all the different identifiers for the patient which can be used to find the patient in different FHIR servers. Each identifier is in the form of a [`system`](https://www.hl7.org/fhir/identifier-registry.html) and `value` pair. A patient who has an identifier matching any of the identifiers in this array is considered a matching patient and any consents associated with that patient will be processed for making consent decisions.                     | 
| `purposeOfUse`             | Purpose of use in the workflow context.                 | 

The JSON Schema for request is included in the repository [here](https://github.com/sdhealthconnect/leap-cds/blob/master/schemas/patient-consent-consult-hook-request.schema.json).

### Response
The response object is similar to the following example:

```json
{
  "cards":[
    {
      "summary":"CONSENT_PERMIT",
      "detail":"There is a patient consent permitting this action.",
      "indicator":"info",
      "source":{
        "label":"Sample",
        "url":"https://sample-cdms.org"
      },
      "extension":{
        "decision":"CONSENT_PERMIT",
        "obligations":[
          {
            "id":{
              "system":"http://terminology.hl7.org/CodeSystem/v3-ActCode",
              "code":"REDACT"
            },
            "parameters":{
              "codes":[
                {
                  "system":"http://terminology.hl7.org/CodeSystem/v3-Confidentiality",
                  "code":"R"
                }
              ]
            }
          }
        ]
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

The `extension` attribute in the `card` object contains a machine-readable object recording the decision with the following attributes: 

| Attribute                   | Description          | 
| :---             |     :---             | 
| `decision`       | Same as the `summary` attribute discussed above.        |
| `obligations`| An array of obligations (as discussed below) conveying additional requirements to be followed by the client.|

Each obligation object has an `id` attribute which identifies the obligation and a `parameters` attribute which specifies the parameters for the obligation. Currently, only the `REDACT` obligation from the [obligation policy valueset](https://www.hl7.org/fhir/v3/ObligationPolicy/vs.html) is supported and is used on `CONSENT_PERMIT` decisions with either of the following parameters:

| Obligation ID  | Description          | 
| :---           |     :---             | 
| `codes`       | Any resources associated with these codes (e.g., tagged with these security labels) must be redacted. In other words, access is permitted except to any resource associated with the codes identified by this attribute.|
|`exceptAnyOfCodes`  | All resources other than the ones associated with these codes (e.g., marked with one or more of these security labels) must be redacted. In other words, access is only permitted to the resources associated with the codes identified by this attribute, and not authorized otherwise. The array is interpreted disjunctively, meaning that access to a resource associated with _any_ (and not _all_) of the codes in this array is authorized.|

## XACML Interface
The XACML interface is based on a limited implementation of the [XACML JSON Profile](https://docs.oasis-open.org/xacml/xacml-json-http/v1.1/os/xacml-json-http-v1.1-os.html) and resides at the following endpoint:

```
/xacml
```




### Request
A `POST` request to this endpoint must have the header `Content-Type` set to `application/json` and have a body similar to the following example:

```json
{
  "Request":{
    "AccessSubject":[
      {
        "Attribute":[
          {
            "AttributeId":"actor",
            "Value":[
              {
                "system":"test-system",
                "value":"test-value"
              }
            ]
          }
        ]
      }
    ],
    "Action":[
      {
        "Attribute":[
          {
            "AttributeId":"scope",
            "Value":"patient-privacy"
          },
          {
            "AttributeId":"purposeOfUse",
            "Value":"TREAT"
          }
        ]
      }
    ],
    "Resource":[
      {
        "Attribute":[
          {
            "AttributeId":"patientId",
            "Value":[
              {
                "system":"http://hl7.org/fhir/sid/us-medicare",
                "value":"0000-000-0000"
              }
            ]
          }
        ]
      }
    ]
  }
}
```
The attributes `patientId`, `scope`, and `actor` are mandatory and `purposeOfUse` is optional. These attributes have the same meanings as in the CDS Hooks interface request `context` discussed above .

The XCAML request follows the [XACML JSON Profile](https://docs.oasis-open.org/xacml/xacml-json-http/v1.1/os/xacml-json-http-v1.1-os.html#_Toc5116205); a JSON schema for the limited subset of this profile applicable for this request is included in the repository [here](https://github.com/sdhealthconnect/leap-cds/tree/master/schemas/xacml-request.schema.json).

### Response
The response from the XACML interface is similar to the following example:

```json
{
  "Response":[
    {
      "Decision":"Permit",
      "Obligations":[
        {
          "Id":{
            "system":"http://terminology.hl7.org/CodeSystem/v3-ActCode",
            "code":"REDACT"
          },
          "AttributeAssignment":[
            {
              "AttributeId":"codes",
              "Value":[
                {
                  "system":"http://terminology.hl7.org/CodeSystem/v3-Confidentiality",
                  "code":"R"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

The response objects follows the [JSON Profile of XACML](https://docs.oasis-open.org/xacml/xacml-json-http/v1.1/os/xacml-json-http-v1.1-os.html#_Toc5116223) and includes a `Response` object with the following attributes: 

| Attribute                   | Description          | 
| :---             |     :---             | 
| `Decision`       | `Permit`, `Deny`, or `NotApplicable` (for the case where no applicable consent is found).        |
|`Obligations`| An array of [`Obligation` objects](https://docs.oasis-open.org/xacml/xacml-json-http/v1.1/os/xacml-json-http-v1.1-os.html#_Toc5116231)  conveying additional requirements to be followed by the client.|

Based on the XACML specifications, each `Obligation` objects has an `Id` which identifies the obligation and an `AttributeAssignment` array which specifies a number of parameters for the obligation, in the form of `AttributeId` and `Value` pairs. Currently, only the `REDACT` obligation from the [obligation policy valueset](https://www.hl7.org/fhir/v3/ObligationPolicy/vs.html) is supported and is used on `Permit` decisions with the same parameters as discussed in the CDS Hooks interface above.

# Setup 

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
