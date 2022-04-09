import { FlowElement, FlowElementStatus } from './element';
import { Link } from './link';

/**
 * Model for a diagram step.
 */
export interface Step extends FlowElement {
    id: string;
    name: string;
    /**
     * Logical path for descriptor, or for custom steps
     * this is the module path to ts file.
     */
    path: string;
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

