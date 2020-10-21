import { FlowElement } from './element';
import { Link } from './link';

/**
 * Model for a diagram step.
 */
export interface Step extends FlowElement {
    id: string;
    name: string;
    path: string;  // module path
    links?: Link[];
    attributes?: {[key: string]: string};
}

// TODO: combine with FlowStatus?
export type StepStatus = 'In Progress' | 'Waiting' | 'Failed' | 'Completed' | 'Canceled'

export interface StepInstance {
    id: string;
    flowInstanceId: string;
    stepId: string;
    status: StepStatus;
    result?: string;
    start?: Date;
    end?: Date;
}
