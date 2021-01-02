import { Step, StepInstance } from './step';
import { Note } from './note';
import { FlowElement, FlowElementStatus, FlowElementType } from './element';

/**
 * Model for a flow diagram
 **/
export interface Flow extends FlowElement {
    path: string;
    steps?: Step[];
    subflows?: Subflow[];
    notes?: Note[];
    variables?: {[key: string]: { type: VariableType }};
}

export type VariableType = 'string' | 'boolean' | 'number' | 'Date' | 'object';

export interface Subflow extends FlowElement {
    id: string;
    name: string;
    steps?: Step[];
}


export interface FlowInstance {
    id: string;
    runId?: string;
    flowPath: string;
    status: FlowElementStatus;
    stepInstances?: StepInstance[];
    subflowInstances?: SubflowInstance[];
    values?: Values;
    start?: Date;
    end?: Date;
}

export type Value = string | boolean | number | Date | object;
export type Values = {[key: string]: Value};

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

export interface SubflowInstance {
    id: string;
    flowInstanceId: string;
    subflowId: string;
    status: FlowElementStatus;
    stepInstances?: StepInstance[];
    start?: Date;
    end?: Date;
}


