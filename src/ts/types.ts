import { AxiosError, AxiosResponse } from 'axios';

export type Dict<T> = Readonly<{ [key: string]: T }>;

export type RequestStates = 'REQUEST' | 'SUCCESS' | 'FAILURE';
export type UrlMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' | 'PATCH';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExtraMeta = Dict<any>;

export type AsyncActionSet = Readonly<{
  FAILURE: string;
  REQUEST: string;
  SUCCESS: string;
}>;

export type ResponseState<T = {}> = Readonly<{
  requestState: RequestStates | null;
  data: AxiosResponse<T> | AxiosError | null;
}>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ResponsesReducerState<T = any> = Dict<Dict<ResponseState<T>>>;

export type SetRequestStatePayload = Readonly<{
  actionSet: AsyncActionSet;
  requestState: RequestStates;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  tag?: string;
}>;
export type ResetRequestStatePayload = Readonly<{
  actionSet: AsyncActionSet;
  tag?: string;
}>;

export interface Options {
  readonly tag?: string;
  shouldRethrow?(errors: AxiosError): boolean;
}

export interface RequestParams extends Options {
  readonly metaData?: ExtraMeta;
  readonly headers?: Dict<string>;
}
