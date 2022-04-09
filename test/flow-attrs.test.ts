import { expect } from 'chai';
import { attrs, loadFileSync } from './shared';
import { Attributes } from '../src/swf/translate/attrs';
import { SwfWorkflow } from '../src/swf/swf-model';

describe('flow attributes', () => {

    it('populates flow spec', async () => {
        const flowSpec = await attrs.getSwfSpec('flow');

        expect(flowSpec.version).to.be.equal('version');
        expect(flowSpec.description).to.be.equal('description');
        expect(flowSpec.functions).to.be.deep.equal({
            element: 'functions',
            props: ['name', 'type', 'operation']
        });
        expect(flowSpec.events).to.be.deep.equal({
            element: 'events',
            props: [
                'name',
                'type',
                'source',
                'correlation[0].contextAttributeName',
                'metadata.dueInterval',
                'metadata.alertInterval'
            ]
        });
    });

    it('applies flow swf data', async () => {
        const swfFlow = loadFileSync('test/flows/order-notifications.flow.yml');
        const { states: _states, ...flowOnly } = swfFlow;
        const flowAttrs: Attributes = {};

        await attrs.applySwf('flow', flowOnly, flowAttrs);

        expect(flowAttrs.version).to.be.equal('1.0');
        expect(flowAttrs.description).to.be.undefined;

        const frows = JSON.parse(flowAttrs.functions);
        expect(frows[0]).to.be.deep.equal([
            'createTask',
            'rest',
            'openapi/azure-tasks.yaml#createTask'
        ]);
        expect(frows[1]).to.be.deep.equal([
            'updateTask',
            'rest',
            'openapi/azure-tasks.yaml#updateTask'
        ]);

        const erows = JSON.parse(flowAttrs.events);
        expect(erows[0]).to.be.deep.equal([
            'ServiceOrderAcknowledgment',
            'order.notifications',
            'eis.lumen.com',
            'orderId',
            '',
            ''
        ]);
        expect(erows[1]).to.be.deep.equal([
            'ServiceOrderConfirmation',
            'order.notifications',
            'eis.lumen.com',
            'orderId',
            '',
            ''
        ]);
        expect(erows[2]).to.be.deep.equal([
            'SOCN',
            'order.notifications',
            'eis.lumen.com',
            'orderId',
            '30 business days',
            '48 hours'
        ]);
    });

    it('applies flow attributes', async () => {
        const flowbeeFlow = loadFileSync('test/flows/order-notifications.flowbee.yaml');
        const swfFlow: SwfWorkflow = {
            id: 'Order Notifications',
            start: 'Create\nSOA Task',
            description: 'To be removed',
            states: []
        };

        await attrs.applyAttrs('flow', flowbeeFlow.attributes, swfFlow);
        expect(swfFlow.version).to.be.equal('1.0');
        expect(swfFlow.description).to.be.undefined;

        const functions = swfFlow.functions!;
        expect(functions[0].name).to.be.equal('createTask');
        expect(functions[0].type).to.be.equal('rest');
        expect(functions[0].operation).to.be.equal('openapi/azure-tasks.yaml#createTask');
        expect(functions[1].name).to.be.equal('updateTask');
        expect(functions[1].type).to.be.equal('rest');
        expect(functions[1].operation).to.be.equal('openapi/azure-tasks.yaml#updateTask');

        const events = swfFlow.events!;
        expect(events[0].name).to.be.equal('ServiceOrderAcknowledgment');
        expect(events[0].type).to.be.equal('order.notifications');
        expect(events[0].source).to.be.equal('eis.lumen.com');
        expect(events[0].correlation![0].contextAttributeName).to.be.equal('orderId');
        expect(events[0].metadata).to.be.undefined;
        expect(events[1].name).to.be.equal('ServiceOrderConfirmation');
        expect(events[1].type).to.be.equal('order.notifications');
        expect(events[1].source).to.be.equal('eis.lumen.com');
        expect(events[1].correlation![0].contextAttributeName).to.be.equal('orderId');
        expect(events[1].metadata).to.be.undefined;
        expect(events[2].name).to.be.equal('SOCN');
        expect(events[2].type).to.be.equal('order.notifications');
        expect(events[2].source).to.be.equal('eis.lumen.com');
        expect(events[2].correlation![0].contextAttributeName).to.be.equal('orderId');
        expect(events[2].metadata!.dueInterval).to.be.equal('30 business days');
        expect(events[2].metadata!.alertInterval).to.be.equal('48 hours');
    });
});
