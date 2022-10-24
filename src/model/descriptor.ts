import { ConfigTemplate } from './template';

export type DescriptorType = 'step' | 'subflow' | 'note';

export interface Descriptor {
    /**
     * Relative to assetRoot. Always forward slashes.
     * Paths with special meaning: 'start', 'stop', 'pause'.
     * If path endsWith '.ts', it's treated as a module path
     * (ie: custom step).
     */
    path: string;
    /**
     * Label for the toolbox
     */
    name: string;
    /**
     * Item type ('step', 'subflow', 'note')
     */
    type: DescriptorType;

    /**
     * Allows multiple outbound links.
     */
    multiLink?: boolean;

    /**
     * Allows multiple inbound links.
     */
    loopbackLink?: boolean;

    /**
     * Icon for the toolbox
     */
    icon?: string | {
        src: string,
        width?: number,
        height?: number
    };
    /**
     * Embedded config template or externalized via file path
     * For tooling only (not used by flowbee unless passed separately
     * to configurator).
     */
    template?: ConfigTemplate | string; // translates to attributes
    runtimeTemplate?: ConfigTemplate;   // for inspect mode

    /**
     * Documentation/info link
     */
    link?: {
        label: string;
        url: string;
    }
}

export class FlowItemDescriptor implements Descriptor {

    path: string;
    name: string;
    icon?: string | {
        src: string,
        width?: number,
        height?: number
    };
    type: DescriptorType;
    category?: string;

    constructor({
        path,
        name: label,
        icon,
        type = 'step'
    }: Descriptor) {
        this.path = path;
        this.name = label;
        this.icon = icon;
        this.type = type;
    }
}

export const start = new FlowItemDescriptor({
    path: 'start',
    name: 'Start',
    type: 'step',
    icon: 'shape:start'
});

export const stop = new FlowItemDescriptor({
    path: 'stop',
    name: 'Stop',
    type: 'step',
    icon: 'shape:stop'
});

export const pause = new FlowItemDescriptor({
    path: 'pause',
    name: 'Pause',
    type: 'step',
    icon: 'shape:pause'
});

export const decide = new FlowItemDescriptor({
    path: 'decide',
    name: 'Decide',
    type: 'step',
    icon: 'shape:decision'
});

export const embedded = new FlowItemDescriptor({
    path: 'subflow',
    name: 'Subflow',
    type: 'subflow',
    icon: 'embedded.png'
});

export const note = new FlowItemDescriptor({
    path: 'note',
    name: 'Note',
    type: 'note',
    icon: 'note.svg'
});

export const StandardDescriptors: Descriptor[] = [
    start,
    stop,
    pause,
    decide,
    embedded,
    note
];

