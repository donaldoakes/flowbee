export type FlowItemDescriptorType = 'step' | 'subflow' | 'note';

export interface Descriptor {
    /**
     * Relative to assetRoot. Always forward slashes.
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
     * Categorization.
     */
    category?: string; // design and run time
    template?: object; // design time -- translates to attributes
    // design time link (optional)
    link?: {
        label: string;
        url: string;
    }
}

/**
 * TODO: below here to be removed?
 */
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
    category: 'start'
});

export const stop = new FlowItemDescriptor({
    path: 'stop',
    name: 'Stop',
    type: 'step',
    icon: 'shape:stop',
    category: 'stop'
});

export const pause = new FlowItemDescriptor({
    path: 'pause',
    name: 'Pause',
    type: 'step',
    icon: 'shape:pause',
    category: 'pause'
});

export const decide = new FlowItemDescriptor({
    path: 'decide',
    name: 'Decide',
    type: 'step',
    icon: 'shape:decision',
    category: 'decision'
});

export const embedded = new FlowItemDescriptor({
    path: 'subflow',
    name: 'Subflow',
    type: 'subflow',
    icon: 'embedded.png',
    category: 'embedded'
});

export const note = new FlowItemDescriptor({
    path: 'note',
    name: 'Note',
    type: 'note',
    icon: 'note.svg',
    category: 'note'
});

export const StandardDescriptors: Descriptor[] = [
    start,
    stop,
    pause,
    decide,
    embedded,
    note
];

