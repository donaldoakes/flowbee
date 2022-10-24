import { FlowElementStatus } from '../model/element';
import { Font } from '../style/font';

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
    minWidth?: number;
    minHeight?: number;
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
    minWidth?: number;
    minHeight?: number;
    hitWidth?: number;
}

export interface NoteOptions {
    font?: Font;
    textColor?: string;
    outlineColor?: string;
    roundingRadius?: number;
    fillColor?: string;
    minWidth?: number;
    minHeight?: number;
    padding?: number;
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
    minWidth?: number;
    minHeight?: number;
    padding?: number;
    meta?: { color: string };
    status?: { [key in FlowElementStatus]: string };
    drag?: { min: number };
    title?: { color?: string, font?: Font };
    label?: LabelOptions;
    milestone?: { color?: string };
    step?: StepOptions;
    link?: LinkOptions;
    subflow?: SubflowOptions;
    note?: NoteOptions;
    grid?: { color?: string, width?: number };
    marquee?: MarqueeOptions;
    anchor?: AnchorOptions;
    highlight?: HighlightOptions;
    hyperlink?: { color?: string };
    multiLink?: boolean;
    loopbackLink?: boolean;
}

