import { expect } from 'chai';
import { attrs, loadFileSync } from './shared';
import { Attributes } from '../src/swf/translate/attrs';
import { InjectState, AnyState, OperationState, EventState } from '../src/swf/swf-model';
import { Step } from '../src/model/step';

describe('state attributes', () => {

    it('applies inject state', async () => {
        const swfFlow = await loadFileSync('test/flows/hello-world.flow.yml');
        const helloState = swfFlow.states.find((s: AnyState) => s.name === 'Hello State');
        const stepAttrs: Attributes = {};

        await attrs.applySwf('inject', helloState, stepAttrs);

        const injectData = JSON.parse(stepAttrs.injectData);
        expect(injectData.result).to.be.equal('Hello World!');
    });

    it('applies inject attributes', async () => {
        const flowbeeFlow = await loadFileSync('test/flows/hello-world.flowbee.yaml');
        const helloStep = flowbeeFlow.steps.find((s: Step) => s.id === 's2');
        const injectState: InjectState = {
            name: 'Hello State',
            type: 'inject'
        };

        await attrs.applyAttrs('inject', helloStep.attributes, injectState);
        const data = injectState.data;
        expect(data!.result).to.be.equal('Hello World!');
    });

    it('applies operation state', async () => {
        const swfFlow = await loadFileSync('test/flows/order-notifications.flow.yml');
        const createSoaState = swfFlow.states.find((s: AnyState) => s.name === 'Create\nSOA Task');
        const stepAttrs: Attributes = {};

        await attrs.applySwf('operation', createSoaState, stepAttrs);

        expect(stepAttrs.functionRef).to.be.equal('createTask');
        const args = JSON.parse(stepAttrs.functionArgs);
        const arg0 = args[0];
        expect(arg0[0]).to.be.equal('op');
        expect(arg0[1]).to.be.equal('add');
        const arg1 = args[1];
        expect(arg1[0]).to.be.equal('path');
        expect(arg1[1]).to.be.equal('/fields/System.Title');
        const arg2 = args[2];
        expect(arg2[0]).to.be.equal('value');
        expect(arg2[1]).to.be.equal('${ .orderId + " SOA" }');

        expect(stepAttrs.actionDataFilterResults).to.be.equal('${ {soaTaskId: .id} }');
        expect(stepAttrs.actionDataFilterUseResults).to.be.equal('true');
    });

    it('applies operation attributes', async () => {
        const flowbeeFlow = await loadFileSync('test/flows/order-notifications.flowbee.yaml');
        const createSoaTaskStep = flowbeeFlow.steps.find((s: Step) => s.id === 's2');
        const opState: OperationState = {
            name: 'Create\nSOA Task',
            type: 'operation'
        };

        await attrs.applyAttrs('operation', createSoaTaskStep.attributes, opState);

        const action = opState.actions![0];
        const functionRef = action.functionRef!;
        expect(functionRef.refName).to.be.equal('createTask');
        const args = functionRef.arguments!;
        expect(args.op).to.be.equal('add');
        expect(args.path).to.be.equal('/fields/System.Title');
        expect(args.value).to.be.equal('${ .orderId + " SOA" }');

        const dataFilter = action.actionDataFilter!;
        expect(dataFilter.results).to.be.equal('${ {soaTaskId: .id} }');
        expect(dataFilter.useResults).to.be.equal('true');
    });

    it('applies event state', async () => {
        const swfFlow = await loadFileSync('test/flows/order-notifications.flow.yml');
        const awaitSoaState = swfFlow.states.find((s: AnyState) => s.name === 'Await\nSOA');
        const stepAttrs: Attributes = {};

        await attrs.applySwf('event', awaitSoaState, stepAttrs);

        const eventRefs = JSON.parse(stepAttrs.eventRefs);
        expect(eventRefs[0][0]).to.be.equal('ServiceOrderAcknowledgment');
        expect(stepAttrs.dueInterval).to.be.equal('24 hours');
        expect(stepAttrs.alertInterval).to.be.equal('2 hours');
    });

    it('applies event attributes', async () => {
        const flowbeeFlow = await loadFileSync('test/flows/order-notifications.flowbee.yaml');
        const awaitSoaStep = flowbeeFlow.steps.find((s: Step) => s.id === 's3');
        const eventState: EventState = {
            name: 'Await\nSOA',
            type: 'event',
            onEvents: [],
            metadata: { oldMeta: 'oldMetaVal', dueInterval: '8 hours' }
        };

        await attrs.applyAttrs('event', awaitSoaStep.attributes, eventState);

        expect(eventState.onEvents.length).to.be.equal(1);
        const eventRefs = eventState.onEvents[0].eventRefs;
        expect(eventRefs.length).to.be.equal(1);
        expect(eventRefs[0]).to.be.equal('ServiceOrderAcknowledgment');
        expect(eventState.onEvents[0].eventDataFilter).to.be.undefined;
        expect(eventState.onEvents[0].actions).to.be.undefined;

        expect(Object.keys(eventState.metadata!).length).to.be.equal(3);
        expect(eventState.metadata!.dueInterval).to.be.equal('24 hours');
        expect(eventState.metadata!.alertInterval).to.be.equal('2 hours');
        expect(eventState.metadata!.oldMeta).to.be.equal('oldMetaVal');
    });

    it('applies event data filter and actions', async () => {
        const swfFlow = await loadFileSync('test/flows/greeting-event.flow.yml');
        const greetState = swfFlow.states.find((s: AnyState) => s.name === 'Greet');
        const stepAttrs: Attributes = {};

        await attrs.applySwf('event', greetState, stepAttrs);

        const eventRefs = JSON.parse(stepAttrs.eventRefs);
        expect(eventRefs.length).to.be.equal(2);
        expect(eventRefs[0][0]).to.be.equal('PersonEvent');
        expect(eventRefs[1][0]).to.be.equal('AnotherEvent');

        expect(stepAttrs.eventDataFilterData).to.be.equal('${ .person }');
        expect(stepAttrs.eventDataFilterToStateData).to.be.equal('${ .person }');
        expect(stepAttrs.functionRef).to.be.equal('greetingFunction');

        const functionArgs = JSON.parse(stepAttrs.functionArgs);
        expect(functionArgs[0][0]).to.be.equal('name');
        expect(functionArgs[0][1]).to.be.equal('${ .person.name }');
    });

    it('applies event data filter attributes', async () => {
        const flowbeeFlow = await loadFileSync('test/flows/greeting-event.flowbee.yaml');
        const awaitSoaStep = flowbeeFlow.steps.find((s: Step) => s.id === 's2');
        const eventState: EventState = {
            name: 'Greet',
            type: 'event',
            onEvents: [
                {
                    eventRefs: ['OldEvent'],
                    eventDataFilter: {
                        data: 'oldData'
                    },
                    actions: [
                        {
                            functionRef: {
                                refName: 'greetingFunction',
                                arguments: { oldArg: 'oldArgVal', name: 'oldNameVal' }
                            }
                        }
                    ]
                }
            ],
            metadata: { oldMeta: 'oldMetaVal' }
        };

        await attrs.applyAttrs('event', awaitSoaStep.attributes, eventState);

        expect(eventState.onEvents.length).to.be.equal(1);
        const eventRefs = eventState.onEvents[0].eventRefs;
        expect(eventRefs.length).to.be.equal(2);
        expect(eventRefs[0]).to.be.equal('PersonEvent');
        expect(eventRefs[1]).to.be.equal('AnotherEvent');
        const dataFilter = eventState.onEvents[0].eventDataFilter!;
        expect(dataFilter.data).to.be.equal('${ .person }');
        expect(dataFilter.toStateData).to.be.equal('${ .person }');
        const actions = eventState.onEvents[0].actions!;
        expect(actions.length).to.be.equal(1);
        const functionRef = actions[0].functionRef!;
        expect(functionRef.refName).to.be.equal('greetingFunction');
        expect(Object.keys(functionRef.arguments!).length).to.be.equal(1);
        expect(functionRef.arguments!.name).to.be.equal('${ .person.name }');

        expect(eventState.metadata!.oldMeta).to.be.equal('oldMetaVal');
    });

    it('applies typescript state', async () => {
        const swfFlow = await loadFileSync('test/flows/custom-typescript.flow.yml');
        const tsState = swfFlow.states.find((s: AnyState) => s.name === 'Custom\nTypeScript');
        const stepAttrs: Attributes = {};

        await attrs.applySwf('typescript', tsState, stepAttrs);
        expect(stepAttrs.tsFile).to.be.equal('test/custom/custom-state.ts');
    });

    it('applies typescript attributes', async () => {
        const flowbeeFlow = await loadFileSync('test/flows/custom-typescript.flowbee.yaml');
        const tsStep = flowbeeFlow.steps.find((s: Step) => s.id === 's5');
        const tsState: OperationState = {
            name: 'Custom\nTypescript',
            type: 'operation'
        };

        await attrs.applyAttrs('typescript', tsStep.attributes, tsState);

        expect(tsState.metadata?.tsFile).to.be.equal('test/custom/custom-state.ts');
    });
});
