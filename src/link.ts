import { FlowItem } from './item';

/**
 * Model for a diagram link.
 */
export interface Link extends FlowItem {
    id: string;
    event?: string;
    from?: string; // not in persisted
    to: string;
    result?: string;
    attributes?: {[key: string]: string};
}