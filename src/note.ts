/**
 * Model for a diagram note.
 */
export interface Note {
    id: string;
    text?: string;
    attributes?: {[key: string]: string};
}