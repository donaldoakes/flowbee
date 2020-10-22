import { Step, StepInstance } from './step';
import { LinkInstance } from './link';
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
    variables?: {[key: string]: { type: VariableType }};
}

export type VariableType = 'string' | 'boolean' | 'number' | 'Date' | 'object';

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
    linkInstances?: LinkInstance[];
    subflowInstances?: SubflowInstance[];
    start?: Date;
    end?: Date;
    template?: boolean;
}

export interface SubflowInstance {
    id: string;
    flowInstanceId: string;
    subflowId: string;
    status: FlowStatus;
    stepInstances?: StepInstance[];
    linkInstances?: LinkInstance[];
    start?: Date;
    end?: Date;
}

export type Values = {[key: string]: string | boolean | number | Date | object};
