/**
 * Model for a diagram link.
 */
export interface Link {
    id: string;
    event?: string;
    from: string;
    to: string;
    result?: string;
    attribute?: {[key: string]: string};
}