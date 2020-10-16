import { FlowItem } from './item';

/**
 * Model for a diagram note.
 */
export interface Note extends FlowItem {
    id: string;
    text?: string;
    attributes?: {[key: string]: string};
}