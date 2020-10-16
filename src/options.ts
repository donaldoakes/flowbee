export class Theme {
    constructor(readonly name: string) {}
    get isDark() {
        return this.name === 'dark' || this.name.endsWith('-dark');
    }
}

export interface DiagramOptions {
    readonly?: boolean;
    iconBase?: string;
    websocketUrl?: string;
    animationSpeed?: number; // segments/s;
    animationLinkFactor?: number; // relative link slice
    maxInstances?: number
}

export const diagramDefault: DiagramOptions = {
    readonly: false,
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

export type Icon = {
    light: string,
    dark: string
}

export interface FlowTreeOptions {
    fileIcon?: string | Icon;
}
export const flowTreeDefault: FlowTreeOptions = { };
