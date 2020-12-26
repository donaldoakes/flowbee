import { FlowElement } from '../model/element';

export type Display = {
    x?: number,
    y?: number,
    w?: number,
    h?: number
}

export type LinkDisplay = Display & {
    type?: string,
    xs?: number[],
    ys?: number[]
}

export type Title = Display & {
    text: string,
    lines?: { text: string, x: number, y: number }[]
}

export function parseDisplay(flowElement: FlowElement): Display | undefined {
    const displayAttr = flowElement.attributes?.display;
    if (displayAttr) {
        const display: Display = {};
        const vals = displayAttr.split(',');
        vals.forEach(function (val) {
        if (val.startsWith('x=')) {
            display.x = parseInt(val.substring(2));
        }
        else if (val.startsWith('y=')) {
            display.y = parseInt(val.substring(2));
        }
        else if (val.startsWith('w=')) {
            display.w = parseInt(val.substring(2));
        }
        else if (val.startsWith('h=')) {
            display.h = parseInt(val.substring(2));
        }
        });
        return display;
    }
}
