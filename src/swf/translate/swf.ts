import * as swf from '../swf-model';
import * as semver from 'semver';
import { TranslatorOptions } from './options';
import { Attrs, TemplateSpec } from './attrs';
import { Flow } from '../../model/flow';
import { Step } from '../../model/step';

export class SwfTranslator {
    private  workflow: swf.SwfWorkflow;
    private readonly attrs: Attrs;

    constructor(
        readonly filePath: string,
        readonly flow: Flow,
        readonly options: TranslatorOptions
    ) {
        this.attrs = new Attrs(options);
    }

    async getWorkflow(): Promise<swf.SwfWorkflow> {
        const startStep = this.flow.steps?.find((s) => s.path === 'start');
        if (!startStep) throw new Error(`No start step found in ${this.filePath}`);
        if (startStep.links?.length !== 1) {
            throw new Error('Start should have 1 out link');
        }
        const firstStep = this.flow.steps?.find((s) => s.id === startStep.links![0].to);
        if (!firstStep) throw new Error(`Step not found: ${startStep.links![0].to}`);

        this.workflow = {
            id: this.flow.id || this.filePath,
            start: firstStep.name,
            states: []
        };

        await this.attrs.applyAttrs('flow', this.flow.attributes || {}, this.workflow);
        if (!semver.valid(this.workflow.version)) {
            throw new Error(`Invalid semantic version: ${this.workflow.version}`);
        }

        if (startStep.path === 'start') {
            this.setMetadata(this.workflow, 'startStepId', startStep.id);
            if (startStep.attributes?.display) {
                this.setMetadata(this.workflow, 'startStepDisplay', startStep.attributes.display);
            }
            if (startStep.name !== 'Start') {
                this.setMetadata(this.workflow, 'startStepName', startStep.name);
            }
            if (startStep.links?.length) {
                const startLink = startStep.links![0];
                if (startLink.attributes?.display) {
                    this.setMetadata(
                        this.workflow,
                        `startLinkDisplay`,
                        startLink.attributes.display
                    );
                }
            }
        }

        await this.addStates([firstStep]);

        return this.workflow;
    }

    /**
     *
     */
    private async addStates(steps: Step[]) {
        for (const step of steps) {
            const state = await this.toState(step);
            this.workflow.states.push(state);
            if (step.links?.length) {
                // TODO parallel
                const link = step.links[0]!;
                if (link.attributes?.display) {
                    this.setMetadata(state, `linkDisplay`, link.attributes.display);
                }
                const next = this.flow.steps?.find((s) => s.id === link.to);
                if (next) {
                    if (next.path === 'stop') {
                        state.end = true;
                        this.setMetadata(state, 'stopStepId', next.id);
                        if (next.attributes?.display) {
                            this.setMetadata(state, 'stopStepDisplay', next.attributes.display);
                        }
                        if (next.name !== 'Stop') {
                            this.setMetadata(state, 'stopStepName', next.name);
                        }
                    } else {
                        state.transition = { nextState: next.name };
                        this.addStates([next]);
                    }
                }
            }
        }
    }

    private async toState(step: Step): Promise<swf.SwfState> {
        let stateType = step.path;
        if (
            step.path === 'typescript' ||
            step.path === 'request' ||
            step.path === 'task' ||
            step.path.endsWith('.ts')
        ) {
            stateType = 'operation';
        } else if (step.path === 'delay') {
            stateType = 'event';
        }

        const state: swf.SwfState = {
            name: step.name,
            type: stateType as swf.StateType
        };

        this.setMetadata(state, 'stepId', step.id);
        if (step.path.endsWith('.ts') || !swf.StateTypes.includes(step.path)) {
            this.setMetadata(state, 'stepPath', step.path);
        }
        if (step.attributes?.display) {
            this.setMetadata(this.workflow, 'stepDisplay', step.attributes.display);
        }

        let templateSpec: TemplateSpec = step.path;
        if (step.path.endsWith('.ts') && this.options.customDescriptors) {
            const descriptor = this.options.customDescriptors.find((d) => d.path === step.path);
            if (descriptor) templateSpec = descriptor;
        }

        await this.attrs.applyAttrs(templateSpec, step.attributes || {}, state);

        if (step.attributes?.display) {
            this.setMetadata(state, 'stepDisplay', step.attributes.display);
        }

        return state;
    }

    private setMetadata(holder: swf.MetaHolder, name: string, value: string) {
        if (!holder.metadata) holder.metadata = {};
        holder.metadata[name] = value;
    }
}
