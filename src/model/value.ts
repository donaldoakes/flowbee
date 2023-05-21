export interface ExpressionValue {
    expression: string;
    value?: string;
    required?: boolean;
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