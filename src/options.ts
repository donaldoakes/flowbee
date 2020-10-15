export type Status = {
    name: string,
    color: string
}

export type Font = {
    name: string,
    size: number
}

export interface StepOptions {
    outlineColor?: string;
    roundingRadius?: number;
    start?: { color?: string, fillColor?: string },
    stop?: { color?: string, fillColor?: string },
    pause?: { color?: string, fillColor?: string },
    minSize?: number;
}

export interface LinkOptions {
    colors?: { default?: string, initiated?: string, traversed?: string };
    lineWidth?: number;
    hitWidth?: number;
    drawColor?: string;
}

export interface SubflowOptions {
    outlineColor?: string;
    roundingRadius?: number;
    hitWidth?: number;
}

export interface NoteOptions {
    font?: Font;
    textColor?: string;
    outlineColor?: string;
    roundingRadius?: number;
    fillColor?: string;
    minSize?: number;
}

export interface MarqueeOptions {
    outlineColor?: string;
    roundingRadius?: number;
}

export interface AnchorOptions {
    width?: number;
    color?: string;
    hitWidth?: number;
}

export interface HighlightOptions {
    margin?: number;
    color?: string;
    lineWidth?: number;
}

export interface DiagramOptions {
    readonly?: boolean;
    iconBase?: string;
    websocketUrl?: string;
}

export interface DrawingOptions {
    backgroundColor?: string;
    defaultFont?: Font;
    defaultLineWidth?: number;
    defaultColor?: string;
    meta?: { color: string };
    data?: { roundingRadius: number };
    drag?: { min: number };
    title?: { color?: string, font?: Font};
    template?: { font?: Font };
    milestone?: { color?: string };
    step?: StepOptions;
    link?: LinkOptions;
    subflow?: SubflowOptions;
    note?: NoteOptions;
    grid?: { color?: string };
    marquee?: MarqueeOptions;
    anchor?: AnchorOptions;
    highlight?: HighlightOptions;
    hyperlink?: { color?: string };
    statuses?: Status[];
}

export const diagramDefault: DiagramOptions = {
    readonly: false,
    iconBase: null,
    websocketUrl: null
};

export interface ToolboxOptions {
    iconBase?: string;
}
export const toolboxDefault: ToolboxOptions = {
    iconBase: null
};

export interface FlowTreeOptions {
    fileIcon?: string;
}
export const flowTreeDefault: FlowTreeOptions = {
    fileIcon: 'flow.svg'
};
