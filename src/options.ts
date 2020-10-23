import { Icon } from './style/icon';

export interface DiagramOptions {
    theme?: string;
    iconBase?: string;
    webSocketUrl?: string;
    animationSpeed?: number; // segments/s;
    animationLinkFactor?: number; // relative link slice
    maxInstances?: number
}

export const diagramDefault: DiagramOptions = {
    theme: 'light',
    iconBase: null,
    webSocketUrl: null,
    animationSpeed: 8,
    animationLinkFactor: 3,
    maxInstances: 10
};

export interface ToolboxOptions {
    theme?: string;
    iconBase?: string;
}
export const toolboxDefault: ToolboxOptions = {
    theme: 'light',
    iconBase: null
};

export interface FlowTreeOptions {
    theme?: string;
    fileIcon?: string | Icon;
}
export const flowTreeDefault: FlowTreeOptions = {
    theme: 'light'
};
