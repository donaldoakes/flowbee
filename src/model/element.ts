import { Flow, Subflow } from './flow';
import { Step } from './step';

export type FlowElementType = 'flow' | 'step' | 'link' | 'subflow' | 'note';

export interface FlowElement {
    id?: string,
    path?: string,
    attributes?: {[key: string]: string};
    type?: FlowElementType; // TODO: optional because of marquee
    readonly?: boolean;
}

export type FlowElementStatus =
    'Pending' |
    'In Progress' |
    'Waiting' |
    'Failed' |
    'Errored' |
    'Completed' |
    'Canceled';

/**
 * Title for a flow element
 */
export const getLabel = (element: FlowElement): string => {
    if (element.type === 'step') return (element as Step).name.replace(/[\r\n]+/g," ");
    else if (element.type === 'subflow') return (element as Subflow).name;
    else if (element.type === 'note') return 'Note';
    else if (element.type === 'link') return 'Link';
    else return getFlowName(element as Flow);
};

/**
 * Without path
 */
export const getFlowName = (flow: Flow): string => {
    let name = flow.path;
    const lastSlash = name.lastIndexOf('/');
    if (lastSlash > 0 && lastSlash < name.length - 1) {
      name = name.substring(lastSlash + 1);
    }
    return name;
};
