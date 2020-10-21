import { FlowItem } from './item';

/**
 * Model for a diagram link.
 */
export interface Link extends FlowItem {
    id: string;
    event?: string;
    to: string;
    result?: string;
    attributes?: {[key: string]: string};
}