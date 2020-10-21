import { FlowElement } from './element';

/**
 * Model for a diagram note.
 */
export interface Note extends FlowElement {
    id: string;
    text?: string;
    attributes?: {[key: string]: string};
}