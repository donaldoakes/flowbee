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
export type StepStatus = 'In Progress' | 'Waiting' | 'Failed' | 'Errored' | 'Completed' | 'Canceled'

export interface StepInstance {
    id: string;
    flowInstanceId: string;
    stepId: string;
    status: StepStatus;
    message?: string;
    result?: string;
    start?: Date;
    end?: Date;
}

export type StepEventType = 'start' | 'exec' | 'finish' | 'error';

export interface StepEvent {
    type: StepEventType;
    instance: StepInstance;
}

