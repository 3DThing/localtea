/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SettingGroup } from './SettingGroup';
import type { SettingValueType } from './SettingValueType';
export type SettingCreate = {
    key: string;
    value?: (string | null);
    value_type?: SettingValueType;
    group?: SettingGroup;
    description?: (string | null);
    is_public?: boolean;
};

