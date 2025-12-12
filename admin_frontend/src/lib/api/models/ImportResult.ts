/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ImportStatus } from './ImportStatus';
export type ImportResult = {
    job_id: string;
    status: ImportStatus;
    total_rows?: number;
    processed?: number;
    created?: number;
    updated?: number;
    errors?: number;
    error_details?: Array<string>;
    started_at?: (string | null);
    completed_at?: (string | null);
};

