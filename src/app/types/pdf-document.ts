import { Annotation } from "./annotation";
import { Card } from "./card";

export interface PDFDocument{
  $id?: string,
  localID: string,
  fileid: string,
  name: string,
  creationTime: number,
  annotations?: string[],
  currentPage: number,
  cards?: Card[],
  tags?: string[]
}