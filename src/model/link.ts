import { FlowElement } from './element';

export type LinkEvent = 'Finish' | 'Error' | 'Cancel' | 'Delay' | 'Resume';

/**
 * Model for a diagram link.
 */
export interface Link extends FlowElement {
    to: string;
    event?: LinkEvent;
    result?: string;
}

export type LinkStatus = 'Initiated' | 'Traversed';
