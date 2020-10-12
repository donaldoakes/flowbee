export type SpecType = 'step' | 'subflow' | 'note';

export interface Specifier {
    id: string;
    label: string;
    icon?: string;
    type?: SpecType;
    category?: string;
    layout?: object; // TODO like pagelet
}

export class FlowSpecifier implements Specifier {

    id: string;
    label: string;
    icon?: string;
    type: SpecType;
    category?: string;
    layout?: object;

    constructor({
        id,
        label,
        icon,
        type = 'step',
        category,
        layout
    }: Specifier) {
        this.id = id;
        this.label = label;
        this.icon = icon;
        this.type = type;
        this.category = category;
        this.layout = layout;
    }
}

export const start = new FlowSpecifier({
    id: 'start',
    label: 'Start',
    icon: 'shape:start',
    category: 'Flow'
});

export const stop = new FlowSpecifier({
    id: 'stop',
    label: 'Stop',
    icon: 'shape:stop',
    category: 'Flow'
});

export const pause = new FlowSpecifier({
    id: 'pause',
    label: 'Pause',
    icon: 'shape:pause',
    category: 'Flow'
});

export const errorSubflow = new FlowSpecifier({
    id: 'subflow',
    label: 'Embedded Subflow',
    icon: 'subflow.svg',
    category: 'Flow',
    type: 'subflow'
});

export const note = new FlowSpecifier({
    id: 'note',
    label: 'Note',
    icon: 'note.svg',
    category: 'Flow',
    type: 'note'
});

export const task = new FlowSpecifier({
    id: 'task',
    label: 'Manual Task',
    icon: 'task.svg',
    category: 'Task'
});

export const StandardSpecifiers: Specifier[] = [
    start,
    stop,
    pause,
    errorSubflow,
    note,
    task
];

