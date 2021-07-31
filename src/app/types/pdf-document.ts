import { Annotation } from "./annotation";

export interface PDFDocument{
  $id?: string,
  localID: string,
  fileid: string,
  name: string,
  creationTime: number,
  annotations?: string[],
  currentPage: number,
  cards?: string[]
}