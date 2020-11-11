import { FlowElement } from './model/element';
import { FlowInstance, SubflowInstance } from './model/flow';
import { LinkInstance } from './model/link';
import { StepInstance } from './model/step';

/**
 * Event is fired with no element on first deselect.
 */
export interface FlowElementEvent {
    element?: FlowElement;
    instances?: FlowInstance[] | StepInstance[] | LinkInstance[] | SubflowInstance[];
}
export interface FlowElementSelectEvent extends FlowElementEvent { }

export interface Listener<T> {
    (event: T): any;
}

export interface Disposable {
    dispose();
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


