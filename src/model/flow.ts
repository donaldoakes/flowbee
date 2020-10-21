import { Step, StepInstance } from './step';
import { Note } from './note';
import { FlowElement } from './element';

/**
 * Model for a flow diagram
 **/
export interface Flow extends FlowElement {
    path: string;
    steps?: Step[];
    subflows?: Subflow[];
    notes?: Note[];
    attributes?: {[key: string]: string};
    variables?: {[key: string]: { type: string }};
}

export interface Subflow extends FlowElement {
    id: string;
    name: string;
    steps?: Step[];
    subflows?: Flow[];
    attributes?: {[key: string]: string};
}

export type FlowStatus = 'Pending' | 'In Progress' | 'Waiting' | 'Failed' | 'Completed' | 'Canceled'

export interface FlowInstance {
    id: string;
    flowPath: string;
    status: FlowStatus;
    stepInstances?: StepInstance[];
    start?: Date;
    end?: Date;
}
