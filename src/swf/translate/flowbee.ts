import * as semver from 'semver';
import { FlowLayout } from './layout';
import * as swf from '../swf-model';
import { TranslatorOptions } from './options';
import { Attrs, Attributes, TemplateSpec } from './attrs';
import { Flow } from '../../model/flow';
import { Step } from '../../model/step';

export class FlowbeeTranslator {
    private flow: Flow;
    private startStep: Step;
    private readonly attrs: Attrs;

    /**
     * @param path used as the id unless swf.id
     * @param swf
     * @param options
     */
    constructor(
        readonly path: string,
        readonly swf: swf.SwfWorkflow,
        readonly options: TranslatorOptions
    ) {
        this.attrs = new Attrs(options);
    }

    async getFlow(): Promise<Flow> {
        const attributes: Attributes = {};
        this.flow = {
            id: this.swf.id || this.path,
            path: this.path,
            attributes
        };

        await this.attrs.applySwf('flow', this.swf, attributes);
        const version = semver.valid(semver.coerce(attributes.version));
        if (!version) {
            throw new Error(`Invalid semantic version: ${this.swf.version}`);
        }
        attributes.version = version;

        this.startStep = {
            id: this.stepId(this.swf, 'startStepId'),
            name: this.metadata(this.swf, 'startStepName', 'Start'),
            path: 'start'
        };
        this.flow.steps = [this.startStep];

        const start = this.swf.states.find((s) => s.name === this.swf.start);
        if (!start) {
            throw new Error(`Unable to find start state: ${this.swf.start}`);
        }

        // link from flowbee start to start state
        this.startStep.links = [
            {
                id: this.getNextLinkId(),
                to: this.stepId(start, 'stepId')
            }
        ];

        await this.addSteps([start]);
        new FlowLayout(this.swf, this.flow).syncFromSwf(this.startStep);

        return this.flow;
    }

    private async addSteps(states: swf.SwfState[]) {
        if (!this.flow.steps) this.flow.steps = [];
        for (const state of states) {
            const step = await this.toStep(state);
            this.flow.steps.push(step);
            const nexts: swf.SwfState[] = [];
            if (state.end) {
                const stopStep = this.getStopStep(state);
                step.links = [ { id: this.getNextLinkId(), to: stopStep.id } ];
                this.flow.steps.push(stopStep);
            } else {
                const transitions: (string | swf.SwfTransition)[] = [];
                if (state.transition) {
                    transitions.push(state.transition);
                } else {
                    const dataConditions: swf.DataCondition[] | undefined = (state as any).dataConditions;
                    if (dataConditions) {
                        for (const dataCondition of dataConditions) {
                            if (dataCondition.end) {
                                const stopStep = this.getStopStep(state);
                                step.links = [ { id: this.getNextLinkId(), to: stopStep.id } ];
                                this.flow.steps.push(stopStep);
                            } else {
                                transitions.push(dataCondition.transition);
                            }
                        }
                    }
                }
                for (const transition of transitions) {
                    if (typeof transition === 'string') {
                        const next = this.swf.states.find((s) => s.name === transition);
                        if (next) nexts.push(next);
                    } else {
                        const next = this.swf.states.find((s) => s.name === transition.nextState);
                        if (next) nexts.push(next);
                    }
                }
            }
            this.addLinks(step, nexts);
            await this.addSteps(nexts);
        }
    }

    private getStopStep(state: swf.SwfState): Step {
        return {
            id: this.stepId(state, 'stopStepId'),
            name: this.metadata(state, 'stopStepName', 'Stop'),
            path: 'stop'
        };
    }

    private async toStep(state: swf.SwfState): Promise<Step> {
        const attributes: { [key: string]: string } = {};
        let path: string = state.type;
        if (state.metadata?.tsFile) {
            path = 'typescript';
        } else if (state.metadata?.stepPath) {
            path = state.metadata.stepPath;
        }

        let templateSpec: TemplateSpec = path;
        if (path.endsWith('.ts') && this.options.customDescriptors) {
            const descriptor = this.options.customDescriptors.find((d) => d.path === path);
            if (descriptor) templateSpec = descriptor;
        }

        await this.attrs.applySwf(templateSpec, state, attributes);
        const step: Step = {
            id: this.stepId(state, 'stepId'),
            name: state.name,
            path,
            attributes
        };

        return step;
    }

    private addLinks(from: Step, nexts: swf.SwfState[]) {
        for (const next of nexts) {
            if (!from.links) from.links = [];
            from.links.push({
                id: this.getNextLinkId(),
                to: this.stepId(next, 'stepId')
            });
        }
    }

    /**
     * Retrieves metadata value if present, else assigns and returns default value.
     */
    private metadata(holder: swf.MetaHolder, key: string, defaultValue: string): string {
        if (!holder.metadata) holder.metadata = {};
        if (holder.metadata[key]) {
            return holder.metadata[key];
        } else {
            holder.metadata[key] = defaultValue;
            return defaultValue;
        }
    }

    private stepId(holder: swf.SwfWorkflow | swf.SwfState, key: string): string {
        if (!holder.metadata) holder.metadata = {};
        let stepId = holder.metadata[key];
        if (stepId) {
            const stepIndex = parseInt(stepId.substring(1));
            if (stepIndex >= this._currentStepIndex) this._currentStepIndex = stepIndex;
        } else {
            stepId = this.getNextStepId();
            holder.metadata[key] = stepId;
        }
        return stepId;
    }

    private _currentStepIndex = 0;
    private getNextStepId(): string {
        return `s${++this._currentStepIndex}`;
    }

    private _nextLinkIndex = 0;
    private getNextLinkId(): string {
        return `l${++this._nextLinkIndex}`;
    }
}
