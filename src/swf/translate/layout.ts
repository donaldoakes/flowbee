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
    private static STD_Y_DIST = 130;
    private static START_STOP_X_ADJ = (FlowLayout.STD_W - FlowLayout.START_STOP_W) / 2;
    private static START_Y_DIST_ADJ = 40;
    private static LINK_GAP = 4;

    constructor(readonly swf: swf.SwfWorkflow, readonly flow: Flow) {
        if (!this.flow.attributes) this.flow.attributes = {};
        this.flow.attributes.NodeStyle = 'BoxIcon';
    }

    syncFromSwf(startStep: Step) {
        if (this.swf.metadata?.startStepDisplay) {
            this.setAttribute(startStep, 'display', this.swf.metadata.startStepDisplay);
        }
        this.layoutSteps([startStep]);
    }

    /**
     * TODO parallel
     */
    private layoutSteps(steps: Step[]) {
        for (const step of steps) {
            const state = this.swf.states.find((s) => s.metadata?.stepId === step.id);
            let display = this.metaDisplay(step, state);
            if (display) {
                if (display.y) this.curY = display.y;
            } else {
                // autodisplay
                display = this.stepDisplay(step);
            }
            this.curY += FlowLayout.STD_Y_DIST;
            if (step.path === 'start') this.curY -= FlowLayout.START_Y_DIST_ADJ;
            if (!step.attributes) step.attributes = {};
            step.attributes.display = toDisplayAttr(display);

            if (step.links) {
                const nexts: Step[] = [];
                for (const link of step.links) {
                    this.layoutLink(step, link, display, state);
                    const next = this.flow.steps?.find((s) => s.id === link.to);
                    if (next) nexts.push(next);
                }
                this.layoutSteps(nexts);
            }
        }
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
        step: Step,
        link: Link,
        display: Display,
        state?: swf.SwfState
    ) {
        if (!link.attributes) link.attributes = {};
        let dispAttr: string | undefined;
        if (step.path === 'start' && this.swf.metadata) {
            dispAttr = this.swf.metadata[`startLinkDisplay`];
        } else if (state?.metadata) {
            dispAttr = state.metadata[`linkDisplay`];
        }
        if (dispAttr) {
            link.attributes.display = dispAttr;
        } else {
            // autolayout
            const x = display.x + display.w / 2;
            const y1 = display.y + display.h + FlowLayout.LINK_GAP;
            const y2 = this.curY - FlowLayout.LINK_GAP;
            link.attributes.display = `type=Elbow,xs=${x}&${x},ys=${y1}&${y2}`;
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
