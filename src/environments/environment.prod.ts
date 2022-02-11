export const environment = {
  production: true,
  API_ENDPOINT: 'https://api.wolke7.cloud/v1',
  API_PROJECT: '6200475f2c3292dbc7b1',
  BASE_URL: 'https://flashcards.wolke7.cloud',
  PDF_ANNOT_URL : 'https://flashcards.wolke7.cloud/extended-pdf',
  MIN_PW_LENGTH: 6,
  MAX_PW_LENGTH: 32,
  collectionMap: {'cards': 'cards', documents: 'documents'}  as any,
  dataVersion: '1.0',
  ANNOTATION_DEL_PREFIX: 'fc-DELDIV_',
  ANNOTATION_JMP_PREFIX: 'fc-JMPDIV_',
  ANNOTATION_ANCHOR_PREFIX: 'fc-ANCDIV_',
  ANNOTATION_ON_CARD_PREFIX: 'fc-CRDTXT_'
};
