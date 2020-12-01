/**
 * Configurator template for displaying and editing
 * attributes.
 */
export type ConfigTemplate = {[key: string]: { widgets: Widget[] }};

export type WidgetType =
    'text' |
    'checkbox' |
    'radio' |
    'textarea' |
    'select' |
    'table' |
    'note' |
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
    instanceProp?: string
    /**
     * Label when rendered in Configurator.
     * No label means span tab width.
     */
    label?: string;
    /**
     * Options for select or list widgets.
     */
    options?: string[];
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
    default?: string;
}