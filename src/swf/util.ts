import { Specification as spec } from '@severlessworkflow/sdk-typescript';
import * as semver from 'semver';

export const validateSwf = (name: string, contents: string) => {
    const workflow = spec.Workflow.fromSource(contents);
    if (!workflow.version || !semver.valid(workflow.version)) {
        throw new Error(`Invalid semantic version: ${workflow.version}`);
    }
};