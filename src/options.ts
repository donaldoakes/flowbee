import { Icon } from './style/icon';

export interface DiagramOptions {
    theme?: string;
    iconBase?: string;
    webSocketUrl?: string;
    resizeWithContainer?: boolean;
    showGrid?: boolean;
    snapToGrid?: boolean;
    showTitle?: boolean;
    promptToDelete?: boolean;
    animationSpeed?: number; // segments/s;
    animationLinkFactor?: number; // relative link slice
    maxInstances?: number
}

export const diagramDefault: DiagramOptions = {
    theme: 'light',
    iconBase: null,
    webSocketUrl: null,
    resizeWithContainer: true,
    showGrid: true,
    snapToGrid: true,
    showTitle: false,
    promptToDelete: false,
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

export interface ConfiguratorOptions {
    theme?: string;
    sourceTab?: 'json' | 'yaml';
    resizable?: boolean;
    movable?: boolean;
}
export const configuratorDefault: ConfiguratorOptions = {
    theme: 'light',
    sourceTab: null
};

export interface FlowTreeOptions {
    theme?: string;
    fileIcon?: string | Icon;
}
export const flowTreeDefault: FlowTreeOptions = {
    theme: 'light'
};

export interface MenuOptions {
    theme?: string;
    iconBase?: string;
}
export const menuDefault: MenuOptions = {
    theme: 'light',
    iconBase: null
};
