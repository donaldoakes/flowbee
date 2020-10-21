export type FlowItemDescriptorType = 'step' | 'subflow' | 'note';

export interface Descriptor {
    /**
     * Unique name
     */
    path: string;
    /**
     * Label for the toolbox
     */
    name: string;
    /**
     * Item type ('step', 'subflow', 'note') -- design time
     */
    type: FlowItemDescriptorType;
    /**
     * Icon for the toolbox -- design time
     */
    icon?: string;
    /**
     * Arbitrary categorization.
     */
    category?: string; // design and run time
    template?: object; // design time -- translates to attributes
}

export class FlowItemDescriptor implements Descriptor {

    path: string;
    name: string;
    icon?: string;
    type: FlowItemDescriptorType;
    category?: string;
    template?: object;

    constructor({
        path,
        name: label,
        icon,
        type = 'step',
        category,
        template: layout
    }: Descriptor) {
        this.path = path;
        this.name = label;
        this.icon = icon;
        this.type = type;
        this.category = category;
        this.template = layout;
    }
}

export const start = new FlowItemDescriptor({
    path: 'start',
    name: 'Start',
    type: 'step',
    icon: 'shape:start',
    category: 'Flow'
});

export const stop = new FlowItemDescriptor({
    path: 'stop',
    name: 'Stop',
    type: 'step',
    icon: 'shape:stop',
    category: 'Flow'
});

export const pause = new FlowItemDescriptor({
    path: 'pause',
    name: 'Pause',
    type: 'step',
    icon: 'shape:pause',
    category: 'Flow'
});

export const errorSubflow = new FlowItemDescriptor({
    path: 'subflow',
    name: 'Embedded Subflow',
    type: 'subflow',
    icon: 'subflow.svg',
    category: 'Flow'
});

export const note = new FlowItemDescriptor({
    path: 'note',
    name: 'Note',
    type: 'note',
    icon: 'note.svg',
    category: 'Flow'
});

export const task = new FlowItemDescriptor({
    path: 'task',
    name: 'Manual Task',
    type: 'step',
    icon: 'task.svg',
    category: 'Task'
});

export const StandardDescriptors: Descriptor[] = [
    start,
    stop,
    pause,
    errorSubflow,
    note,
    task
];

