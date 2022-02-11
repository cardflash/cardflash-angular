export interface Annotation{
  id: string;
  page: number;
  type: string;
  color: string;
  points: [number,number,number,number][];
  text?: string;
  imgID?: string;
  comment?: string;
}