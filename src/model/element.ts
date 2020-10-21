export type FlowElementType = 'flow' | 'step' | 'subflow' | 'note' | 'link';

export interface FlowElement {
    id?: string,
    attributes?: {[key: string]: string};
    type?: FlowElementType; // TODO: optional because of marquee
}