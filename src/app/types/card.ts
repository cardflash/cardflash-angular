import { Annotation } from "./annotation";


export interface Card{
    localID: string,
    front: string,
    back: string,
    page: number,
    hiddenText: string,
    chapter: string,
    title: string,
    imgs?: string[],
    imgsLocal?: string[],
    $id?: string,
    creationTime? : number,
    annotations?: Annotation[]
}