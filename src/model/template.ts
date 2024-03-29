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
     * Prop name for instance value
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
     * Set this for selects so that attribute will be populated with first value.
     */
    default?: string | ((element: { attributes?: {[key: string]: string} }) => string);

    min?: number;
    max?: number;

    /**
     * For select: multiple select
     * For table: multiple lines (defaults to true)
     */
    multi?: boolean;

    action?: string;

    /**
     * HTML title (only for readonly, non-decorated)
     */
    title?: string | ((val?: string) => string | undefined);
}

export const setTitle = (elem: HTMLElement, widget: Widget, value?: string) => {
    if (value) {
        if (typeof widget.title === 'string') {
            elem.title = value;
        } else if (typeof widget.title === 'function') {
            elem.title = widget.title(value || undefined);
        }
    }
};