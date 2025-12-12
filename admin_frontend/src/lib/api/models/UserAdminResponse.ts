/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UserAdminResponse = {
    id: number;
    email: string;
    username: string;
    is_active: boolean;
    is_superuser: boolean;
    is_email_confirmed: boolean;
    email_confirm_token?: (string | null);
    firstname?: (string | null);
    lastname?: (string | null);
    middlename?: (string | null);
    birthdate?: (string | null);
    address?: (string | null);
    postal_code?: (string | null);
    phone_number?: (string | null);
    avatar_url?: (string | null);
    created_at?: (string | null);
};

