import { AxiosError, AxiosResponse } from 'axios';

export type Dict<T> = Readonly<{ [key: string]: T }>;

export type RequestStates = 'REQUEST' | 'SUCCESS' | 'FAILURE';
export type UrlMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' | 'PATCH';

export type MetaData = Dict<any>;

export type Meta = MetaData & {
  readonly tag: string;
};

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

export interface Options {
  shouldRethrow?(errors: AxiosError): boolean;
}

export interface RequestParams extends Options {
  readonly metaData?: MetaData;
  readonly tag?: string;
  readonly headers?: Dict<string>;
}
