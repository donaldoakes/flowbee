/**
 * Configurator template for displaying and editing
 * attributes.
 */
export type ConfigTemplate = {[key: string]: { widgets: Widget[] }};

export type WidgetType =
    'text' |
    'textarea' |
    'select' |
    'table' |
    'source';

export interface Widget {
    /**
     * Attribute name from flow definition.
     */
    attribute?: string;
    /**
     * Label when rendered in Configurator.
     * No label means span tab width.
     */
    label?: string;
    /**
     * Widget type
     */
    type?: WidgetType;
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
}