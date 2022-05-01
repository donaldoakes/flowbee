import { LinkLayout } from '../../draw/layout';
import { Flow } from '../../model/flow';
import { Link } from '../../model/link';
import { Step } from '../../model/step';
import * as swf from '../swf-model';

export type Display = {
    x: number;
    y: number;
    w: number;
    h: number;
};

export type LinkDisplay = {
    type: string,
    xs: number[],
    ys: number[]
}

const parseDisplay = (displayAttr: string): Display => {
    const display: Display = { x: 0, y: 0, w: 0, h: 0 };
    const vals = displayAttr.split(',');
    vals.forEach(function (val) {
        if (val.startsWith('x=')) {
            display.x = parseInt(val.substring(2));
        } else if (val.startsWith('y=')) {
            display.y = parseInt(val.substring(2));
        } else if (val.startsWith('w=')) {
            display.w = parseInt(val.substring(2));
        } else if (val.startsWith('h=')) {
            display.h = parseInt(val.substring(2));
        }
    });
    return display;
};

const toDisplayAttr = (display: Display): string => {
    let attr = 'x=' + display.x + ',y=' + display.y;
    if (display.w) {
        attr += ',w=' + display.w + ',h=' + display.h;
    }
    return attr;
};

export class FlowLayout {
    private curX = 200;
    private curY = 50;
    private static STD_W = 100;
    private static STD_H = 80;
    private static START_STOP_W = 60;
    private static START_STOP_H = 40;
    private static PARALLEL_INDENT = 180;
    private static STD_Y_DIST = 130;
    private static START_STOP_X_ADJ = (FlowLayout.STD_W - FlowLayout.START_STOP_W) / 2;
    private static START_Y_DIST_ADJ = 40;

    constructor(readonly swf: swf.SwfWorkflow, readonly flow: Flow) {
        if (!this.flow.attributes) this.flow.attributes = {};
        this.flow.attributes.NodeStyle = 'BoxIcon';
    }

    syncFromSwf(startStep: Step) {
        if (this.swf.metadata?.startStepDisplay) {
            this.setAttribute(startStep, 'display', this.swf.metadata.startStepDisplay);
        }
        this.layoutSteps([startStep], false);
    }

    private layoutSteps(steps: Step[], incrementY: boolean) {
        const prevX = this.curX;
        if (incrementY) this.curY += FlowLayout.STD_Y_DIST;
        for (const [i, step] of steps.entries()) {
            const state = this.swf.states.find((s) => s.metadata?.stepId === step.id);
            let display = this.metaDisplay(step, state);
            if (display) {
                if (display.y) this.curY = display.y;
            } else {
                // autodisplay
                if (i > 0) this.curX += FlowLayout.PARALLEL_INDENT;
                display = this.stepDisplay(step);
            }
            if (step.path === 'start') this.curY -= FlowLayout.START_Y_DIST_ADJ;

            if (!step.attributes) step.attributes = {};
            step.attributes.display = toDisplayAttr(display);

            if (step.links) {
                const nexts = new Map<Link, Step>();
                for (const link of step.links) {
                    const next = this.flow.steps?.find((s) => s.id === link.to);
                    if (next) nexts.set(link, next);
                }
                const prevY = this.curY;
                this.layoutSteps(Array.from(nexts.values()), true);
                for (const link of nexts.keys()) {
                    const next = nexts.get(link);
                    this.layoutLink(step, link, next, state);
                }
                this.curY = prevY;
            }
        }
        this.curX = prevX;
    }

    /**
     * Returns display metadata if found for step
     */
    private metaDisplay(step: Step, state?: swf.SwfState): Display | undefined {
        if (step.path === 'start') {
            if (this.swf.metadata?.startStepDisplay) {
                this.setAttribute(step, 'display', this.swf.metadata.startStepDisplay);
                return parseDisplay(this.swf.metadata.startStepDisplay);
            }
        } else if (step.path === 'stop') {
            // attribute should have already been set from metadata on upstream step
            if (step.attributes?.display) {
                return parseDisplay(step.attributes.display);
            } else {
                this.stepDisplay(step);
            }
        } else {
            if (state?.metadata?.stopStepDisplay) {
                const stopStep = this.getStopStep(step);
                if (stopStep) {
                    this.setAttribute(stopStep, 'display', state.metadata.stopStepDisplay);
                }
            }
            if (state?.metadata?.stepDisplay) {
                this.setAttribute(step, 'display', state.metadata.stepDisplay);
                return parseDisplay(state.metadata.stepDisplay);
            }
        }
    }

    /**
     * Finds ONE outbound stop step if exists
     */
    private getStopStep(step: Step): Step | undefined {
        if (step.links) {
            for (const link of step.links) {
                const next = this.flow.steps?.find((step) => step.id === link.to);
                if (next?.path === 'stop') {
                    return next;
                }
            }
        }
    }

    private layoutLink(
        from: Step,
        link: Link,
        to: Step,
        state?: swf.SwfState
    ) {
        if (!link.attributes) link.attributes = {};
        let dispAttr: string | undefined;
        if (from.path === 'start' && this.swf.metadata) {
            dispAttr = this.swf.metadata.startLinkDisplay;
            if (this.swf.metadata.startLinkLabel) link.result = this.swf.metadata.startLinkLabel;
        } else if (to.path === 'stop' && state?.metadata?.stopLinkDisplay) {
            dispAttr = state.metadata.stopLinkDisplay;
            if (state.metadata.stopLinkLabel) link.result = state.metadata.stopLinkLabel;
        } else if (from.path === 'switch') {
            const linkDisplays = JSON.parse(state?.metadata?.linkDisplays || '{}');
            dispAttr = linkDisplays[to.id];
        } else {
            dispAttr = (state as any)?.transition?.metadata?.linkDisplay;
            if (!dispAttr) {
                // compatibility
                dispAttr = state.metadata.linkDisplay;
            }
        }
        if (dispAttr) {
            if (dispAttr.indexOf('=NaN') >= 0) {
                // fix poorly-saved label attributes
                const display = LinkLayout.fromAttr(dispAttr);
                const fromDisplay = parseDisplay(from.attributes!.display);
                const toDisplay = parseDisplay(to.attributes!.display);
                new LinkLayout(display, fromDisplay, toDisplay).calcLabel();
                link.attributes.display = LinkLayout.toAttr(display);
            } else {
                link.attributes.display = dispAttr;
            }
        } else {
            // autolayout
            const fromDisplay = parseDisplay(from.attributes!.display);
            const toDisplay = parseDisplay(to.attributes!.display);
            let points: number | undefined;
            if ((fromDisplay.x + fromDisplay.w/2) !== (toDisplay.x + toDisplay.w/2)) points = 3;
            const display = { type: points ? 'ElbowH' : 'Elbow', xs: [], ys: [] };
            const linkLayout = new LinkLayout(display, fromDisplay, toDisplay);
            linkLayout.calcLink(points);
            linkLayout.calcLabel();
            link.attributes.display = LinkLayout.toAttr(linkLayout.display);
        }
    }

    private stepDisplay(step: Step): Display {
        const isStartStop = step.path === 'start' || step.path === 'stop';
        return {
            x: isStartStop ? this.curX + FlowLayout.START_STOP_X_ADJ : this.curX,
            y: this.curY,
            w: isStartStop ? FlowLayout.START_STOP_W : FlowLayout.STD_W,
            h: isStartStop ? FlowLayout.START_STOP_H : FlowLayout.STD_H
        };
    }

    private setAttribute(step: Step, name: string, value: string) {
        if (!step.attributes) step.attributes = {};
        step.attributes[name] = value;
    }
}
