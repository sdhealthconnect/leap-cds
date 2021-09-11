# LEAP-CDS
LEAP Consent Decision Service (LEAP-CDS) enables clients to query about the patient consents applicable to a particular workflow or exchange context. The client provides information about the context of the workflow and the LEAP-CDS responds whether the activity in question is authorized by the patient consent and whether any obligations must be enforced. Patient consents are assumed to be stored in FHIR servers known as Consent Stores which must be introduced to the LEAP-CDS as part of the service configuration. For more details on the general architecture of LEAP-CDS, see [here](https://sdhealthconnect.github.io/leap/blog/2020/04/29/architecture.html).

# API
LEAP-CDS provides two API endpoints interfacing to this service:

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
  "hook":"patient-consent-consult",
  "hookInstance":"hook-instance-123",
  "context":{
    "patientId":[
      {
        "system":"http://hl7.org/fhir/sid/us-ssn",
        "value":"111111111"
      }
    ],
    "category": [ 
      {
        "system": "http://terminology.hl7.org/CodeSystem/consentscope",
        "code": "patient-privacy"
      }
    ],
    "class":[
      {
        "system":"http://hl7.org/fhir/resource-types",
        "value":"MedicationStatement"
      }
    ],
    "purposeOfUse":["TREAT"],
    "actor":[
      {
        "system":"urn:ietf:rfc:3986",
        "value":"2.16.840.1.113883.20.5"
      }
    ]
  }
}
```
The `hook` attribute must be set to the hook name, in this case `patient-consent-consult`. The hook instance must be set to a unique value identifying the request (these are the requirements from the CDS Hooks specifications and currently have no effects in the behaviour of the LEAP-CDS).

The `context` attribute must be present and record the context of the query using the following attributes:

| Attribute                   | Description                  | 
| :---                       |     :---                        | 
| `category`        | An array of codes specifying the broad context of the request (e.g., the workflow context) in order to narrow down the applicable consent types. If more than one category codes are provided, at least one of them should be present for the consent to be deemed applicable. This parameter is optional and not providing it will cause the Consent Decision Service to look at every valid consent otherwise applicable to the request context.                   | 
| `actor` _(required)_                   | An array containing different identifiers of the actor involved in the context of the query (e.g., recipient organization, the clinician engaged in the workflow, etc.). Consents could match based on any of these identifiers. This allows identifying the actor to various degrees of granularity (e.g., organization, end-user, etc.) and match with consents applicable to any of the actors. It also ensures that the applicable consents are found even if different FHIR servers know the actor by different identifiers.     |
| `patientId` _(required)_   | An array containing all the different patient identifiers to ensure that the patient is matched even if identified by different identifiers across different FHIR servers. Each identifier is in the form of a [`system`](https://www.hl7.org/fhir/identifier-registry.html) and `value` pair. A patient who has an identifier matching any of the identifiers in this array is considered a matching patient and any consents associated with that patient will be processed for making consent decisions.                     | 
| `purposeOfUse`             | The purpose(s) of use in the workflow context. This should be in the form of a string array, or a single string value (in case there is only one purpose) of the codes from the [FHIR Purpose of Use valueset](https://www.hl7.org/fhir/v3/PurposeOfUse/vs.html). Note that only the code (i.e., without the code system) should be given, as shown in the example below. Rules matching _any_ of the values in the purpose of use array will be considered in making the final consent decision.              | 
| `class`             | An array of content classes in the workflow context. These are codes from the [Content Class Valueset](https://www.hl7.org/fhir/valueset-consent-content-class.html).              | 

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
        ],
        "basedOn": "http://fhir.server.example/fhir/Consent/10023"
      }
    }
  ]
}
```
Based on the CDS Hooks specifications, the response is in the form of an array of `card` objects. The LEAP-CDS returns a single `card` in the response array. The mandatory `source` attribute is currently set to carry the name and URL of the LEAP-CDS service (defined by environment variables).

The `summary` is set to one of the following according to the consent decision:

| Value                   | Description                                     |
| :---                    |     :---                                        |
| `NO_CONSENT`            | No applicable consent to the context was found (even though the patient may have consents partially matching the request `context`). The `indicator` attribute is set to `warning` in this case.|
| `CONSENT_PERMIT`        | Patient consent permits the current request.  The `indicator` attribute is set to `info` in this case.. |
| `CONSENT_DENY`          | Patient consent denies the current request. The `indicator` attribute is set to `critical` in this case.. |

The `extension` attribute in the `card` contains a machine-readable object recording the decision with the following attributes: 

| Attribute                   | Description          | 
| :---             |     :---             | 
| `decision`       | Same as the `summary` attribute discussed above.        |
| `obligations`| An array of obligations (as discussed below) conveying additional requirements to be followed by the client.|
|`basedOn` | The full URI of the consent resource based on which the decision has been made. Note that this is the URI from the Consent Decision Service's perspective and it may not be accessible to the client. |

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
                "system":"urn:ietf:rfc:3986",
                "value":"2.16.840.1.113883.20.5"
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
            "AttributeId":"category",
            "Value":[ 
              {
                "system": "http://terminology.hl7.org/CodeSystem/consentscope",
                "code": "patient-privacy"
              }
            ]
          },
          {
            "AttributeId":"purposeOfUse",
            "Value":["TREAT"]
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
                "system":"http://hl7.org/fhir/sid/us-ssn",
                "value":"111111111"
              }
            ]
          },
          {
            "AttributeId":"class",
            "Value":[
              {
                "system":"http://hl7.org/fhir/resource-types",
                "value":"MedicationStatement"
              }
            ]
          }
        ]
      }
    ]
  }
}
```
The attributes `patientId` and `actor` are mandatory while `category` and `purposeOfUse` are optional. These attributes have the same meanings as in the CDS Hooks interface request `context` discussed above.

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

The response follows the [JSON Profile of XACML](https://docs.oasis-open.org/xacml/xacml-json-http/v1.1/os/xacml-json-http-v1.1-os.html#_Toc5116223) and includes a `Response` object with the following attributes: 

| Attribute                   | Description          | 
| :---             |     :---             | 
| `Decision`       | `Permit`, `Deny`, or `NotApplicable` (for the case where no applicable consent is found, i.e. `NO_CONSENT`).        |
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

# Test
You can use `load-fixtures.js` (in the `test-scripts` directory) to set up a quick set of resources on your FHIR server to test this service. This script loads a patient resource, two organization resources, and a consent resource of choice, (from the samples provided in [`test/fixtures`](https://github.com/sdhealthconnect/leap-cds/tree/master/test/fixtures)) to a FHIR server, preparing it to be used as the Consent Store for the LEAP-CDS. The usage is as the following:

```
$ cd test-scripts
$ node load-fixtures.js FHIR_BASE CONSENT_FILE_NAME
```
in which `FHIR_BASE` is the base URL for your FHIR server and `CONSENT_FILE_NAME` is the file name for one of the consent resources in [`test/fixtures/consents`](https://github.com/sdhealthconnect/leap-cds/tree/master/test/fixtures/consents)).
For example:

```
$ node load-fixtures.js http://localhost:8080/fhir consent-boris-deny-restricted-label.json
```

Note that this script sets the `dateTime` attribute of the consent resource to the current date and time, so that the loaded consent is considered the most recent. 
