import { Step, StepInstance } from './step';
import { Note } from './note';
import { FlowElement, FlowElementType } from './element';

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

export type FlowStatus = 'Pending' | 'In Progress' | 'Waiting' | 'Errored' | 'Completed' | 'Canceled'

export interface FlowInstance {
    id: string;
    runId: string;
    flowPath: string;
    status: FlowStatus;
    stepInstances?: StepInstance[];
    subflowInstances?: SubflowInstance[];
    values?: Values;
    start?: Date;
    end?: Date;
}
export type Values = {[key: string]: string | boolean | number | Date | object};

/**
 * exec only applies to steps
 */
export type FlowEventType = 'start' | 'exec' | 'finish' | 'error';

export interface FlowEvent {
    eventType: FlowEventType;
    elementType: FlowElementType;
    flowPath: string,
    flowInstanceId: string,
    instance: FlowInstance | SubflowInstance | StepInstance;
}

export type SubflowStatus = 'Pending' | 'In Progress' | 'Waiting' | 'Errored' | 'Completed' | 'Canceled'

export interface SubflowInstance {
    id: string;
    flowInstanceId: string;
    subflowId: string;
    status: SubflowStatus;
    stepInstances?: StepInstance[];
    start?: Date;
    end?: Date;
}


