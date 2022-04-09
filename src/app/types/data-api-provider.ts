export interface Config {
  // drawOnPdf: boolean,
  // selectionOnTop : boolean,
  autoAddAnki: boolean,
  deckName : string,
  // addImageOption: boolean,
  areaSelectOnlyText: boolean,
  // addOcrTextOption: boolean,
  // ocrLanguage: string,
  // addTextAsHidden: boolean,
  singlePageMode: boolean,
  showSelectionSizeOptions: boolean,
  autoDrawLines: boolean,
  autoAddAnnotationsToCard: boolean,
  enableAnnotationLinking: boolean,
  showDebugInfo: boolean
}

export const DEFAULT_CONFIG : Config= {
  autoAddAnki: false,
  deckName : 'Default',
  // addImageOption: boolean,
  areaSelectOnlyText: false,
  // addOcrTextOption: boolean,
  // ocrLanguage: string,
  // addTextAsHidden: boolean,
  singlePageMode: false,
  showSelectionSizeOptions: false,
  autoDrawLines: false,
  autoAddAnnotationsToCard: true,
  enableAnnotationLinking: true,
  showDebugInfo: false
}

export interface Entry {
  $id: string;
  $collection: string;
  $read: string[];
  $write: string[];
}

export interface EntryWithCreationTime extends Entry {
  creationTime: number;
}

export interface EntryList<T extends Entry> {
  sum: number;
  documents: T[];
}

export interface FileEntry {
  $id: string;
  name: string;
  mimeType: string;
  dateCreated: number;
}

export const ENTRY_TYPES = {
  DOCUMENTS: 'documents',
  CARDS: 'cards',
};
export type ENTRY_TYPES = typeof ENTRY_TYPES[keyof typeof ENTRY_TYPES];


export interface QueryOption{
  type: 'search' | '=' | '<' | '>' | '<=' | '>=',
  attribute: string,
  values: string[] //| number[] | boolean[]
}

export interface DataApiProvider {
  createEntry<T extends Entry>(
    type: ENTRY_TYPES,
    data: object,
    read?: string[],
    write?: string[]
  ): Promise<T>;

  getEntry<T extends Entry>(type: ENTRY_TYPES, id: string): Promise<T>;

  updateEntry<T extends Entry>(type: ENTRY_TYPES, id: string, data: any): Promise<T>;

  deleteEntry(type: ENTRY_TYPES, id: string): Promise<{}>;

  listEntries<T extends EntryWithCreationTime>(
    type: ENTRY_TYPES,
    queries: QueryOption[] | undefined,
    newestFirst: boolean | undefined
  ): Promise<EntryList<T>>;

  getFileView(id: string): Promise<URL>;
  getFilePreview(id: string): Promise<URL>;

  saveFile(file: File): Promise<FileEntry>;

  deleteFile(id: string): Promise<{}>;

  getPreferences(): Promise<Config>;

  savePreferences(config: Config): Promise<void>;

  makeBackup() : Promise<any>;
}
