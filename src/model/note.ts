import { FlowElement } from './element';

/**
 * Model for a diagram note.
 */
export interface Note extends FlowElement {
    text?: string;
}