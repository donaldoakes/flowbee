import { FlowEvent, FlowInstance, SubflowInstance } from '../model/flow';
import { StepInstance } from '../model/step';
import { Diagram } from './diagram';
import { FlowEventHandler } from './handler';

export class WebSocketListener {

  private websocket: WebSocket;
  private eventHandler: FlowEventHandler;

  constructor(private diagram: Diagram) {
    console.log(`websocket binding to: ${this.diagram.options.webSocketUrl}`);
    this.websocket = new WebSocket(this.diagram.options.webSocketUrl);
    this.eventHandler = new FlowEventHandler(diagram);
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
      this.eventHandler.handleEvent(flowEvent);
    });
  }

  stop() {
      this.websocket.close();
  }
}