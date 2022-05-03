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

export interface SubFlowRef {
    workflowId: string;
    version?: string;
    onParentComplete?: 'continue' | 'terminate';
}

export interface SwfAction {
    functionRef?: FunctionRef;
    subFlowRef?: SubFlowRef;
    actionDataFilter?: ActionDataFilter;
    retryRef?: string;
    retryableErrors?: string[];
}

export interface SwfTransition {
    nextState: string;
    metadata?: Metadata;
}

export type StateType = 'operation' | 'event' | 'inject' | 'switch' | 'parallel';
export const StateTypes = ['operation', 'event', 'inject', 'switch', 'parallel'];

export interface SwfState {
    name: string;
    type: StateType;
    transition?: string | SwfTransition;
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

export interface Condition {
    name?: string;
    transition?: string | SwfTransition;
    end?: boolean;
}

export interface DataCondition extends Condition {
    condition: string;
}

export interface EventCondition extends Condition {
    eventRef: string;
}

export interface SwitchState extends SwfState {
    dataConditions?: DataCondition[];
    eventConditions?: EventCondition[];
}

export interface Branch {
    name: string;
    actions: SwfAction[];
}

export interface ParallelState extends SwfState {
    completionType: 'allOf'; // only this is supported
    branches?: Branch[];
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
