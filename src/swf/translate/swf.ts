import * as swf from '../swf-model';
import * as semver from 'semver';
import { TranslatorOptions } from './options';
import { Attrs, TemplateSpec } from './attrs';
import { Flow } from '../../model/flow';
import { Step } from '../../model/step';
import { Link } from '../../model/link';

/**
 * From Flowbee flow to SWF workflow.
 */
export class SwfTranslator {
    private  workflow: swf.SwfWorkflow;
    private readonly attrs: Attrs;

    /**
     * @param path used as id unless flow.id
     * @param flow
     * @param options
     */
    constructor(
        readonly path: string,
        readonly flow: Flow,
        readonly options: TranslatorOptions
    ) {
        this.attrs = new Attrs(options);
    }

    async getWorkflow(): Promise<swf.SwfWorkflow> {
        const startStep = this.flow.steps?.find((s) => s.path === 'start');
        if (!startStep) throw new Error(`No start step found in ${this.path}`);
        if (startStep.links?.length !== 1) {
            throw new Error('Start should have 1 out link');
        }
        const firstStep = this.flow.steps?.find((s) => s.id === startStep.links![0].to);
        if (!firstStep) throw new Error(`Step not found: ${startStep.links![0].to}`);

        this.workflow = {
            id: this.flow.id || this.path,
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
                this.setMetadata(this.workflow, `startLinkDisplay`, startLink.attributes.display);
                this.setMetadata(this.workflow, 'startLinkLabel', startLink.result);
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

            // prep switch state to receive conditions from flowbee steps
            if (step.path === 'switch') {
                (state as swf.SwitchState).dataConditions = [];
                delete state.metadata?.linkDisplays;
            }

            if (step.links?.length) {
                for (const link of step.links) {
                    const next = this.flow.steps?.find((s) => s.id === link.to);
                    if (next) {
                        if (next.path === 'stop') {
                            if (step.path === 'switch') {
                                this.addDataCondition(state, step, link, next);
                            } else {
                                state.end = true;
                                this.setMetadata(state, 'stopLinkDisplay', link.attributes.display);
                                this.setMetadata(state, 'stopLinkLabel', link.result);
                            }
                            this.setMetadata(state, 'stopStepId', next.id);
                            if (next.attributes?.display) {
                                this.setMetadata(state, 'stopStepDisplay', next.attributes.display);
                            }
                            if (next.name !== 'Stop') {
                                this.setMetadata(state, 'stopStepName', next.name);
                            }
                        } else {
                            if (step.path === 'switch') {
                                this.addDataCondition(state, step, link, next);
                            } else {
                                state.transition = { nextState: next.name };
                                this.setMetadata(state.transition, 'linkDisplay', link.attributes.display);
                                if (link.result) {
                                    this.setMetadata(state.transition, 'linkLabel', link.result);
                                }
                            }
                            await this.addStates([next]);
                        }
                    }
                }
            }
        }
    }

    /**
     * Also adds linkDisplays meta to switch state.
     * TODO: EventConditions?
     */
    private addDataCondition(state: swf.SwitchState, step: Step, link: Link, next: Step) {
        if (!state.dataConditions) state.dataConditions = [];
        const rows = JSON.parse(step.attributes?.conditions || '[[]]');
        let condition: swf.DataCondition;
        if (next.path === 'stop') {
            if (state.dataConditions.find(dc => dc.end)) {
                return; // only one end condition
            }
            condition = { condition: '', end: true };
            const row = rows.find((r: string[]) => ('' + r[2]) === 'true');
            if (row) {
                if (row[0]) condition.name = row[0];
                if (row[1]) condition.condition = row[1];
            }
        } else {
            condition = { condition: '', transition: next.name };
            const row = rows.find((r: string[]) => r[3] === next.name);
            if (row) {
                if (row[0]) condition.name = row[0];
                if (row[1]) condition.condition = row[1];
            }
        }
        state.dataConditions.push(condition);

        const linkDisplays: { [name: string]: string } = JSON.parse(state.metadata?.linkDisplays || '{}');
        linkDisplays[next.id] = link.attributes.display;
        this.setMetadata(state, 'linkDisplays', JSON.stringify(linkDisplays));
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
