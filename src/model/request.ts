export interface Request {
    name: string;
    method: string;
    url: string;
    headers: { [key: string]: string };
    body?: string;
    submitted?: Date;
    source: string;
}

export interface Response {
    status: {
        /**
         * zero means no results, negative means error like can't connect
         */
        code: number;
        message: string;
    };
    headers: { [key: string]: string };
    body?: string;
    submitted?: Date;
    time?: number;
    source?: string;
    loading: boolean;
}

export interface Result {
    state?: 'passed' | 'failed' | 'skipped' | 'errored';
    message?: string;
}
