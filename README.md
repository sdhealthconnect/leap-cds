# LEAP-CDS
LEAP Consent Decision Service

# CDS Hook Interface
The Consent Decision Service provides an interface based on the specifications for [Clinical Decision Support (CDS) Hooks](https://cds-hooks.org/). Following these specifications, a client can query about the patient consent in various contexts including clinical workflows using a rich and flexible interface.

The CDS hook is namaed `patient-consent-consult` and, following the CDS Hooks specifications, it resides at the following endpoint:
```
/cds-services/patient-consent-consult
```

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
