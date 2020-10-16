export type FlowItemType = 'flow' | 'step' | 'subflow' | 'note' | 'link';

export interface FlowItem {
    id?: string,
    attributes?: {[key: string]: string};
    type?: FlowItemType; // TODO: optional because of marquee
}

