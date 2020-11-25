import { FlowElement } from './element';

export type LinkEvent = 'Finish' | 'Error' | 'Cancel' | 'Delay' | 'Resume';

/**
 * Model for a diagram link.
 */
export interface Link extends FlowElement {
    id: string;
    to: string;
    event?: LinkEvent;
    result?: string;
    attributes?: {[key: string]: string};
}

export type LinkStatus = 'Initiated' | 'Traversed';
