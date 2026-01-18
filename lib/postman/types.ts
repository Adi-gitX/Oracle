// Postman Types & Interfaces

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type AuthType = 'none' | 'bearer' | 'basic' | 'apikey';

export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary';

export interface KeyValue {
    key: string;
    value: string;
    enabled: boolean;
    description?: string;
}

export interface AuthConfig {
    type: AuthType;
    bearer?: {
        token: string;
    };
    basic?: {
        username: string;
        password: string;
    };
    apikey?: {
        key: string;
        value: string;
        addTo: 'header' | 'query';
    };
}

export interface RequestBody {
    type: BodyType;
    raw?: string;
    formData?: KeyValue[];
    urlencoded?: KeyValue[];
}

export interface RequestConfig {
    id?: string;
    name?: string;
    method: HttpMethod;
    url: string;
    headers: KeyValue[];
    params: KeyValue[];
    auth: AuthConfig;
    body: RequestBody;
}

export interface ResponseData {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    time: number;
    size: number;
    cookies?: Array<{
        name: string;
        value: string;
        domain?: string;
        path?: string;
    }>;
}

export interface RequestHistoryItem {
    id: string;
    timestamp: number;
    request: RequestConfig;
    response: ResponseData;
}

export interface Collection {
    id: string;
    name: string;
    description?: string;
    requests: SavedRequest[];
    folders: CollectionFolder[];
    createdAt: number;
    updatedAt: number;
}

export interface CollectionFolder {
    id: string;
    name: string;
    requests: SavedRequest[];
}

export interface SavedRequest {
    id: string;
    name: string;
    request: RequestConfig;
}

export interface Environment {
    id: string;
    name: string;
    variables: EnvironmentVariable[];
    isActive: boolean;
}

export interface EnvironmentVariable {
    key: string;
    value: string;
    enabled: boolean;
    secret?: boolean;
}

export interface PostmanSettings {
    followRedirects: boolean;
    timeout: number;
    sslVerification: boolean;
}

export interface PostmanStorage {
    history: RequestHistoryItem[];
    collections: Collection[];
    environments: Environment[];
    activeEnvironment: string | null;
    settings: PostmanSettings;
}

// Default values
export const defaultRequestConfig: RequestConfig = {
    method: 'GET',
    url: '',
    headers: [],
    params: [],
    auth: { type: 'none' },
    body: { type: 'none' }
};

export const defaultSettings: PostmanSettings = {
    followRedirects: true,
    timeout: 30000,
    sslVerification: true
};

// Method colors for UI
export const methodColors: Record<HttpMethod, string> = {
    GET: '#61affe',
    POST: '#49cc90',
    PUT: '#fca130',
    PATCH: '#50e3c2',
    DELETE: '#f93e3e',
    HEAD: '#9012fe',
    OPTIONS: '#0d5aa7'
};
