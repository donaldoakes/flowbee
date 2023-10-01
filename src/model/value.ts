export interface ExpressionValue {
    expression: string;
    value?: string;
    location?: string;
}

export interface UserValues {
    values: ExpressionValue[];
    overrides?: { [expr: string]: string };
}

export type ValueType = string | number | boolean | Date | null;
