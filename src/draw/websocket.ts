import { FlowEvent, FlowInstance, SubflowInstance } from '../model/flow';
import { StepInstance } from '../model/step';
import { Diagram } from './diagram';

export class WebSocketListener {

  private websocket: WebSocket;

  constructor(private diagram: Diagram) {
    console.log(`websocket binding to: ${this.diagram.options.webSocketUrl}`);
    this.websocket = new WebSocket(this.diagram.options.webSocketUrl);
  }

  /**
   * TODO: values
   */
  listen() {
    const topic = `{ "topic": "flowInstance-${this.diagram.instance.id}" }`;
    console.log(`websocket listening on: ${topic}`);
    this.websocket.addEventListener('open', () => {
        this.websocket.send(topic);
    });
    this.websocket.addEventListener('message', event => {
      const flowEvent = JSON.parse(event.data) as FlowEvent;
      if (flowEvent.elementType === 'flow') {
        this.diagram.instance = flowEvent.instance as FlowInstance;
      }
      if (flowEvent.elementType === 'subflow') {
        const subInstance = flowEvent.instance as SubflowInstance;
        const subflow = this.diagram.getSubflow(subInstance.subflowId);
        if (subflow) {
          if (!subflow.instances) subflow.instances = [];
          if (!this.diagram.instance.subflowInstances) this.diagram.instance.subflowInstances = [];
          const subIdx = subflow.instances.findIndex(inst => inst.id === subInstance.id);
          if (subIdx === -1) {
            subflow.instances.push(subInstance);
            this.diagram.instance.subflowInstances.push(subInstance);
          } else {
            subflow.instances[subIdx] = subInstance;
            this.diagram.instance.subflowInstances[subIdx] = subInstance;
          }
          subflow.draw();
        }
      } else if (flowEvent.elementType === 'step') {
        const stepInstance = flowEvent.instance as StepInstance;
        let step = this.diagram.getStep(stepInstance.stepId);
        if (step) {
          if (!step.instances) step.instances = [];
          if (!this.diagram.instance.stepInstances) this.diagram.instance.stepInstances = [];
          let stepIdx = step.instances.findIndex(inst => inst.id === stepInstance.id);
          if (stepIdx === -1) {
            step.instances.push(stepInstance);
          } else {
            step.instances[stepIdx] = stepInstance;
          }
          stepIdx = this.diagram.instance.stepInstances.findIndex(inst => inst.id === stepInstance.id);
          if (stepIdx === -1) {
            this.diagram.instance.stepInstances.push(stepInstance);
          } else {
            this.diagram.instance.stepInstances[stepIdx] = stepInstance;
          }
        } else {
          for (const subflow of this.diagram.subflows) {
            step = subflow.getStep(stepInstance.stepId);
            if (step) {
              if (!step.instances) step.instances = [];
              const subflowInst = subflow.instances?.length ? subflow.instances[subflow.instances.length - 1] : null;
              if (subflowInst) {
                if (!subflowInst.stepInstances) subflowInst.stepInstances = [];
                const stepIdx = step.instances.findIndex(inst => inst.id === stepInstance.id);
                if (stepIdx === -1) {
                  step.instances.push(stepInstance);
                  subflowInst.stepInstances.push(stepInstance);
                } else {
                  step.instances[stepIdx] = stepInstance;
                  subflowInst.stepInstances[stepIdx] = stepInstance;
                }
              }
              break;
            }
          }
        }
        if (step) {
          if (flowEvent.eventType === 'start') {
            for (const inLink of this.diagram.getInLinks(step)) {
              inLink.status = this.diagram.getLinkStatus(inLink.link.id);
              inLink.draw();
            }
          }
          step.draw();
          if (this.diagram.options.scrollIntoView) {
            this.diagram.scrollIntoView(step);
          }
        }
      }
    });
  }

  stop() {
      this.websocket.close();
  }
}