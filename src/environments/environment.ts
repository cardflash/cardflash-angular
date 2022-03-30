// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  API_ENDPOINT: 'https://api.cardflash.net/v1',
  API_PROJECT: '6200475f2c3292dbc7b1',
  BASE_URL: 'http://localhost:4200',
  PDF_ANNOT_URL : 'http://localhost:4200/doc',
  ANKI_MODEL_VERSION: '3.3a',
  MIN_PW_LENGTH: 6,
  MAX_PW_LENGTH: 32,
  collectionMap: {'cards': 'cards', documents: 'documents'}  as any,
  dataVersion: '1.0',
  ANNOTATION_DEL_PREFIX: 'fc-DELDIV_',
  ANNOTATION_JMP_PREFIX: 'fc-JMPDIV_',
  ANNOTATION_ANCHOR_PREFIX: 'fc-ANCDIV_',
  ANNOTATION_ON_CARD_PREFIX: 'fc-CRDTXT_',
  ANNOTATION_ELEMENT_PREFIX: 'fc-ANNOEL_',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
