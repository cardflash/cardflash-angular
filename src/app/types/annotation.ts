export interface Annotation{
  id: string;
  page: number;
  type: string;
  color: string;
  points: [number,number,number,number][];
  text?: string;
  imgSrc?: string;
}