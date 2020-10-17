import { Icon } from './draw/display';

export interface DiagramOptions {
    iconBase?: string;
    websocketUrl?: string;
    animationSpeed?: number; // segments/s;
    animationLinkFactor?: number; // relative link slice
    maxInstances?: number
}

export const diagramDefault: DiagramOptions = {
    iconBase: null,
    websocketUrl: null,
    animationSpeed: 8,
    animationLinkFactor: 3,
    maxInstances: 10
};

export interface ToolboxOptions {
    iconBase?: string;
}
export const toolboxDefault: ToolboxOptions = {
    iconBase: null
};

export interface FlowTreeOptions {
    fileIcon?: string | Icon;
}
export const flowTreeDefault: FlowTreeOptions = { };
