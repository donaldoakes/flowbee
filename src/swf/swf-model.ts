export interface SwfFunction {
    name: string;
    type: 'rest' | 'graphql' | 'custom';
    operation: string;
    metadata?: Metadata;
}

export type Metadata = { [key: string]: string };
export interface MetaHolder {
    metadata?: Metadata;
}

export interface EventCorrelation {
    contextAttributeName: string;
    contextAttributeValue?: string;
}

export interface SwfEvent {
    name: string;
    type: string;
    source?: string;
    correlation?: EventCorrelation[];
    metadata?: Metadata;
}

export interface EventDataFilter {
    data?: string;
    useData?: boolean;
    toStateData?: string;
}

export interface FunctionRef {
    refName: string;
    arguments?: { [key: string]: string };
}

export interface ActionDataFilter {
    results: string;
    useResults?: boolean;
    fromStateData?: string;
    toStateData?: string;
}

export interface SwfAction {
    functionRef?: FunctionRef;
    actionDataFilter?: ActionDataFilter;
    retryRef?: string;
    retryableErrors?: string[];
}

export interface SwfTransition {
    nextState: string;
    metadata?: Metadata;
}

export type StateType = 'operation' | 'event' | 'inject';
export const StateTypes = ['operation', 'event', 'inject'];

export interface SwfState {
    name: string;
    type: StateType;
    transition?: SwfTransition | string;
    end?: boolean;
    stateDataFilter?: StateDataFilter;
    metadata?: Metadata;
}

export interface StateDataFilter {
    input?: string;
    output?: string;
}

export interface OperationState extends SwfState {
    actions?: SwfAction[];
}

export interface OnEvent {
    eventRefs: string[];
    actions?: SwfAction[];
    eventDataFilter?: EventDataFilter;
}

export interface EventState extends SwfState {
    onEvents: OnEvent[];
}

export interface InjectState extends SwfState {
    data?: { [key: string]: any };
}

/**
 * Supported swf states
 */
export type AnyState = OperationState | EventState | InjectState;

export interface SwfWorkflow {
    id: string;
    version?: string;
    name?: string;
    description?: string;
    start: string;

    functions?: SwfFunction[];
    events?: SwfEvent[];

    states: SwfState[];

    metadata?: Metadata;
}
