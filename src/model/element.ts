import { Flow, Subflow } from './flow';
import { Step } from './step';

export type FlowElementType = 'flow' | 'step' | 'subflow' | 'note' | 'link';

export interface FlowElement {
    id?: string,
    attributes?: {[key: string]: string};
    type?: FlowElementType; // TODO: optional because of marquee
    readonly?: boolean;
}

/**
 * Title for a flow element
 */
export const getLabel = (element: FlowElement): string => {
    if (element.type === 'flow') return getFlowName(element as Flow);
    else if (element.type === 'step') return (element as Step).name.replace(/[\r\n]+/g," ");
    else if (element.type === 'subflow') return (element as Subflow).name;
    else if (element.type === 'note') return 'Note';
    else if (element.type === 'link') return 'Link';
};

/**
 * Without path or extension
 */
export const getFlowName = (flow: Flow): string => {
    const lastSlash = flow.path.lastIndexOf('/');
    if (lastSlash > 0 && lastSlash < flow.path.length - 1) {
      return flow.path.substring(lastSlash + 1);
    }
    const lastDot = flow.path.lastIndexOf('.');
    if (lastDot > 1) {
      return flow.path.substring(0, lastDot);
    }
};
