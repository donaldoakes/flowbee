import { Icon } from './style/icon';

export type Mode = 'select' | 'connect' | 'runtime';

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
    maxInstances?: number;
    scrollIntoView?: boolean;
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

export interface FlowDumpOptions {
    indent?: number;
}

export interface ToolbarOptions {
    theme?: string;
    iconBase?: string;
    helpUrl?: string;
}
export const toolbarDefault: ToolbarOptions = {
    theme: 'light',
    iconBase: null
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
    moveAndResize?: boolean;
}
export const configuratorDefault: ConfiguratorOptions = {
    theme: 'light',
    sourceTab: null,
    moveAndResize: true
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
    theme: 'light'
};

export interface PopupAction {
    name: string;
    label?: string;
    close?: boolean;
}

export interface PopupOptions {
    title: string;
    theme?: string;
    help?: {
        link: string;
        title?: string;
        icon?: string;
    }
    margins?: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    },
    actions?: PopupAction[];
}

export interface ValuesOptions extends PopupOptions {
    valuesBaseUrl?: string;
    abbreviateLocations?: boolean
}

export const popupDefaults: PopupOptions = {
    theme: 'light',
    title: '',
    margins: {
        top: 75,
        right: 100,
        bottom: 75,
        left: 100
    }
};
