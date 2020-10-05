/**
 * Model for a diagram link.
 */
export interface Link {
    id: string;
    to: string;
    event?: string;
    attribute?: {[key: string]: string};
}