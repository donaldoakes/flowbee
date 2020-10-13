export type FlowItemType = 'step' | 'subflow' | 'note';

export interface Descriptor {
    /**
     * Unique name
     */
    name: string;
    /**
     * Label for the toolbox
     */
    label: string;
    /**
     * Icon for the toolbox
     */
    icon?: string;
    /**
     * Item type ('step', 'subflow', 'note')
     */
    type?: FlowItemType;
    /**
     * Arbitrary categorization.
     */
    category?: string;
    template?: object; // TODO like pagelet
}

export class FlowItemDescriptor implements Descriptor {

    name: string;
    label: string;
    icon?: string;
    type: FlowItemType;
    category?: string;
    template?: object;

    constructor({
        name,
        label,
        icon,
        type = 'step',
        category,
        template: layout
    }: Descriptor) {
        this.name = name;
        this.label = label;
        this.icon = icon;
        this.type = type;
        this.category = category;
        this.template = layout;
    }
}

export const start = new FlowItemDescriptor({
    name: 'start',
    label: 'Start',
    icon: 'shape:start',
    category: 'Flow'
});

export const stop = new FlowItemDescriptor({
    name: 'stop',
    label: 'Stop',
    icon: 'shape:stop',
    category: 'Flow'
});

export const pause = new FlowItemDescriptor({
    name: 'pause',
    label: 'Pause',
    icon: 'shape:pause',
    category: 'Flow'
});

export const errorSubflow = new FlowItemDescriptor({
    name: 'subflow',
    label: 'Embedded Subflow',
    icon: 'subflow.svg',
    category: 'Flow',
    type: 'subflow'
});

export const note = new FlowItemDescriptor({
    name: 'note',
    label: 'Note',
    icon: 'note.svg',
    category: 'Flow',
    type: 'note'
});

export const task = new FlowItemDescriptor({
    name: 'task',
    label: 'Manual Task',
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

