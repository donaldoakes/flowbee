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

export interface FlowTreeOptions {
    fileIcon?: string;
}
export const flowTreeDefault: FlowTreeOptions = {
    fileIcon: 'flow.svg'
};

export type Status = {
    name: string,
    color: string
}

export type Font = {
    name: string,
    size: number
}

export interface LabelOptions {
    select?: {
        color?: string;
        padding?: number;
        roundingRadius?: number;
    }
}

export interface StepOptions {
    outlineColor?: string;
    roundingRadius?: number;
    minSize?: number;
    start?: { color?: string, fillColor?: string };
    stop?: { color?: string, fillColor?: string };
    pause?: { color?: string, fillColor?: string };
    state?: {
        width?: number;
        previous?: {
            width?: number;
        }
    }
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
    padding?: number;
    color?: string;
    lineWidth?: number;
}

export interface DrawingOptions {
    backgroundColor?: string;
    defaultFont?: Font;
    defaultLineWidth?: number;
    defaultColor?: string;
    padding?: number;
    meta?: { color: string };
    drag?: { min: number };
    title?: { color?: string, font?: Font, visibility?: 'visible' | 'hidden' };
    template?: { font?: Font };
    label?: LabelOptions;
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
    data?: { roundingRadius: number };
    statuses?: Status[];
}

