/**
 * Configurator template for displaying and editing
 * attributes.
 */
export type ConfigTemplate = {
    [key: string]: { widgets: Widget[] }
};

export type WidgetType =
    'text' |
    'button' |
    'checkbox' |
    'radio' |
    'textarea' |
    'code' |
    'select' |
    'date' |
    'datetime' |
    'number' |
    'table' |
    'note' |
    'link' |
    'file' |
    'source';

export interface Widget {
    /**
     * Widget type
     */
    type: WidgetType;
    /**
     * Attribute name from flow definition.
     */
    attribute?: string;
    /**
     * Instance property
     */
    instanceProp?: string;
    instanceEdit?: boolean;

    /**
     * Label when rendered in Configurator.
     * No label means span tab width.
     */
    label?: string;
    /**
     * Options for select or list widgets.
     */
    options?: string[] | ((attribute?: string) => string[]);
    /**
     * Sub-widgets for tables.
     */
    widgets?: Widget[];
    /**
     * Read-only
     */
    readonly?: boolean;
    /**
     * Default value.
     * Set this for selects so that attribute will
     * be populated with first value.
     */
    default?: string | ((element: { attributes?: {[key: string]: string} }) => string);

    min?: number;
    max?: number;

    multi?: boolean;

    action?: string;
}