export interface Specifier {
    id: string;
    label: string;
    icon?: string;
    category?: string;
    layout?: object; // TODO like pagelet
}

export class FlowSpecifier implements Specifier {
    constructor(
        readonly id: string,
        readonly label: string,
        readonly icon?: string,
        readonly category?: string,
        readonly layout?: object
    ) { }
}