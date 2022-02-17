export const environment = {
  production: true,
  API_ENDPOINT: 'https://api.cardflash.net/v1',
  API_PROJECT: '6200475f2c3292dbc7b1',
  BASE_URL: 'https://app.cardflash.net',
  PDF_ANNOT_URL : 'https://app.cardflash.net/doc',
  ANKI_MODEL_VERSION: '1.0a',
  MIN_PW_LENGTH: 8,
  MAX_PW_LENGTH: 32,
  collectionMap: {'cards': 'cards', documents: 'documents'}  as any,
  dataVersion: '1.0',
  ANNOTATION_DEL_PREFIX: 'fc-DELDIV_',
  ANNOTATION_JMP_PREFIX: 'fc-JMPDIV_',
  ANNOTATION_ANCHOR_PREFIX: 'fc-ANCDIV_',
  ANNOTATION_ON_CARD_PREFIX: 'fc-CRDTXT_',
  ANNOTATION_ELEMENT_PREFIX: 'fc-ANNOEL_',
};
