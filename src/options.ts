export type Status = {
    name: string,
    color: string
}

export type Font = {
    name: string,
    size: number
}

export interface TextOptions {
    color?: string;
    font?: Font;
}

export interface StepOptions {
    outlineColor?: string;
    roundingRadius?: number;
    milestoneColor?: string;
    startColor?: string;
    stopColor?: string;
    pauseColor?: string;
    filledTextColor?: string;
    minSize?: number;
}

export interface LinkColors {
    default?: string;
    initiated?: string;
    traversed?: string;
}

export interface LinkOptions {
    colors?: LinkColors;
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

export interface GridOptions {
    color?: string;
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

export interface HyperlinkOptions {
    color?: string;
}

export interface DiagramOptions {
    iconBase?: string;
    websocketUrl?: string;
    backgroundColor?: string;
    defaultFont?: Font;
    defaultLineWidth?: number;
    defaultColor?: string;
    metaColor?: string;
    defaultRoundingRadius?: number;
    minDrag?: number;
    title?: TextOptions;
    template?: TextOptions;
    step?: StepOptions;
    link?: LinkOptions;
    subflow?: SubflowOptions;
    note?: NoteOptions;
    grid?: GridOptions;
    marquee?: MarqueeOptions;
    anchor?: AnchorOptions;
    highlight?: HighlightOptions;
    hyperlink?: HyperlinkOptions;
    statuses?: Status[];
}

export interface ToolboxOptions {
    iconBase?: string;
    backgroundColor?: string;
    labelColor?: string;
}

const diagramDefault: DiagramOptions = {
    iconBase: null,
    websocketUrl: null,
    backgroundColor: '#ffffff',
    defaultFont: {
        name: '12px sans-serif',
        size: 12,
    },
    defaultLineWidth: 1,
    defaultColor: 'black',
    metaColor: 'gray',
    defaultRoundingRadius: 12,
    minDrag: 3,
    title: {
        color: '#360303',
        font: {
            name: 'bold 18px sans-serif',
            size: 18
        }
    },
    template: {
        font: {
            name: 'bold italic 18px sans-serif',
            size: 18
        }
    },
    step: {
        outlineColor: 'black',
        roundingRadius: 12,
        milestoneColor: '#4cafea',
        startColor: '#98fb98',
        stopColor: '#ff8c86',
        pauseColor: '#fffd87',
        filledTextColor: 'black',
        minSize: 4
    },
    link: {
        colors: {
            default: '#9e9e9e',
            initiated:'blue',
            traversed: 'black'
        },
        lineWidth: 3,
        hitWidth: 8,
        drawColor: 'green'
    },
    subflow: {
        outlineColor: '#337ab7',
        roundingRadius: 12,
        hitWidth: 7
    },
    note: {
        font: {
            name: '13px monospace',
            size: 13
        },
        textColor: '#101010',
        outlineColor: 'gray',
        roundingRadius: 2,
        fillColor: '#ffc',
        minSize: 4
    },
    grid: {
        color: 'lightgray'
    },
    marquee: {
        outlineColor: 'cyan',
        roundingRadius: 2
    },
    anchor: {
        width: 3,
        color: '#ec407a',
        hitWidth: 8,
    },
    highlight: {
        margin: 10,
        color: '#03a9f4',
        lineWidth: 3
    },
    hyperlink: {
        color: '#1565c0'
    },
    statuses: [
        { name: 'Unknown', color: 'transparent' },
        { name: 'Pending', color: 'blue' },
        { name: 'In Progress', color: 'green' },
        { name: 'Failed', color: 'red' },
        { name: 'Completed', color: 'black' },
        { name: 'Canceled', color: 'darkgray' },
        { name: 'Hold', color: 'cyan' },
        { name: 'Waiting', color: 'yellow' }
    ]
};

/**
 * merged into diagramDefault
 */
const diagramDark: DiagramOptions = {
    backgroundColor: '#1e1e1e',
    defaultColor: '#d4d4d4',
    title: {
        color: '#d4d4d4'
    },
    step: {
        outlineColor: '#bbbbbb'
    },
    link: {
        colors: {
            default: '#9e9e9e',
            initiated:'blue',
            traversed: 'white'
        }
    },
    subflow: {
        outlineColor: '#4ba5C7'
    },
    note: {
        outlineColor: 'lightgray'
    },
    grid: {
        color: '#787878'
    }
};

const toolboxDefault: ToolboxOptions = {
    iconBase: null,
    backgroundColor: '#f3f3f3',
    labelColor: '#616161'
};

/**
 * merged into toolboxDefault
 */
const toolboxDark: ToolboxOptions = {
    backgroundColor: '#252526',
    labelColor: '#cccccc'
};

export const DefaultOptions = {
    diagram: {
        light: diagramDefault,
        dark: diagramDark
    },
    toolbox: {
        light: toolboxDefault,
        dark: toolboxDark
    }
};
