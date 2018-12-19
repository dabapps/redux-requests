import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

export type Dict<T> = Readonly<{ [key: string]: T }>;

export type RequestStates = 'REQUEST' | 'SUCCESS' | 'FAILURE';
export type UrlMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' | 'PATCH';

export type RequestMetaData = {
  readonly tag: string;
} & Dict<any>;

export type AsyncActionSet = Readonly<{
  FAILURE: string;
  REQUEST: string;
  SUCCESS: string;
}>;

export type ResponseState = Readonly<{
  requestState: RequestStates | null;
  data: AxiosResponse<any> | AxiosError | null;
}>;

export type ResponsesReducerState = Dict<Dict<ResponseState>>;

export type SetRequestStatePayload = Readonly<{
  actionSet: AsyncActionSet;
  requestState: RequestStates;
  data: any;
  tag?: string;
}>;
export type ResetRequestStatePayload = Readonly<{
  actionSet: AsyncActionSet;
  tag?: string;
}>;

export interface RequestParams {
  readonly tag?: string;
  readonly metaData?: Partial<RequestMetaData>;
  readonly headers?: Dict<string>;
  shouldRethrow?(errors: AxiosError): boolean;
}

export interface ExtendedRequestParams extends RequestParams {
  readonly headers?: Dict<string>;
  readonly axiosConfig?: AxiosRequestConfig;
}
