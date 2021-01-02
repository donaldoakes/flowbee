import { FlowElement, FlowElementStatus } from './element';
import { Link } from './link';

/**
 * Model for a diagram step.
 */
export interface Step extends FlowElement {
    id: string;
    name: string;
    path: string;  // module path
    links?: Link[];
}

export interface StepInstance {
    id: string;
    flowInstanceId: string;
    stepId: string;
    status: FlowElementStatus;
    message?: string;
    result?: string;
    start?: Date;
    end?: Date;
    data?: any;
}

