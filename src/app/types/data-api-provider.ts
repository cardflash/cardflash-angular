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
    queries: string[] | undefined,
    newestFirst: boolean | undefined
  ): Promise<EntryList<T>>;

  getFileView(id: string): Promise<URL>;
  getFilePreview(id: string): Promise<URL>;

  saveFile(file: File): Promise<FileEntry>;

  deleteFile(id: string): Promise<{}>;
}
