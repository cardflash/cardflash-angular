// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  API_ENDPOINT: 'https://api.siter.eu/v1',
  API_PROJECT: '60f9c38babc3e',
  BASE_URL: 'http://localhost:4200',
  MIN_PW_LENGTH: 6,
  MAX_PW_LENGTH: 32,
  collectionMap: {'cards': '60fbdf8f6f4ee'}  as any,
  dataVersion: '1.0',
  ANNOTATION_DEL_PREFIX: 'fc-DELDIV_',
  ANNOTATION_JMP_PREFIX: 'fc-JMPDIV_',
  ANNOTATION_ON_CARD_PREFIX: 'fc-CRDTXT_'
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
