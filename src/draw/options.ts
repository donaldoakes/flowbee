import { Font } from './display';

export type Status = {
    name: string,
    color: string
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
