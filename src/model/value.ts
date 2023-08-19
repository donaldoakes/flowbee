export interface ExpressionValue {
    expression: string;
    value?: string;
    location?: string;
}

export interface UserValues {
    values: ExpressionValue[];
    overrides?: { [expr: string]: string };
}

export interface ValuesAction {
    name: string;
    label?: string;
    close?: boolean;
}

export type ValueType = string | number | boolean | Date | null;
