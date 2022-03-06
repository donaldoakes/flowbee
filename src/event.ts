import { Descriptor } from './model/descriptor';
import { FlowElement } from './model/element';
import { Flow, FlowInstance, SubflowInstance } from './model/flow';
import { StepInstance } from './model/step';

export type FlowElementInstance = FlowInstance | StepInstance | SubflowInstance;

export interface FlowElementEvent {
    element: FlowElement;
    instances?: FlowElementInstance[];
}
export interface FlowElementAddEvent extends FlowElementEvent {
    descriptor?: Descriptor
}
export interface FlowElementSelectEvent extends FlowElementEvent { }
export interface FlowChangeEvent {
    flow: Flow;
}
export interface FlowElementUpdateEvent {
    element: FlowElement;
    action?: string;
}
export interface ItemOpenEvent {
    url: string;
}

/**
 * Undefined position means configurator has been closed.
 */
export interface ConfiguratorPositionEvent {
    position?: { left: number, top: number, width: number, height: number };
}

export interface Listener<T> {
    (event: T): any;
}

export interface Disposable {
    dispose(): void;
}

export class TypedEvent<T> {

    private listeners: Listener<T>[] = [];
    private oncers: Listener<T>[] = [];

    on(listener: Listener<T>): Disposable {
        this.listeners.push(listener);
        return {
            dispose: () => this.off(listener)
        };
    }

    once(listener: Listener<T>): void {
        this.oncers.push(listener);
    }

    off(listener: Listener<T>) {
        const callbackIndex = this.listeners.indexOf(listener);
        if (callbackIndex > -1) {
            this.listeners.splice(callbackIndex, 1);
        }
    }

    emit(event: T) {
        // notify general listeners
        this.listeners.forEach(listener => listener(event));

        // clear the oncers queue
        if (this.oncers.length > 0) {
            const toCall = this.oncers;
            this.oncers = [];
            toCall.forEach(listener => listener(event));
        }
    }

    pipe(te: TypedEvent<T>): Disposable {
        return this.on(e => te.emit(e));
    }
}


