import { AxiosResponse } from 'axios';
import { Dict } from '../utils';

export type RequestStates = 'REQUEST' | 'SUCCESS' | 'FAILURE';
export type UrlMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' | 'PATCH';

export interface RequestMetaData {
  tag?: string;
  itemId?: string;
  subgroup?: string;
  shouldAppend?: boolean;
  ordering?: string;
  response?: AxiosResponse;
}

export type AsyncActionSet = Readonly<{
  FAILURE: string;
  REQUEST: string;
  SUCCESS: string;
}>;

export type ResponseState = Readonly<{
  requestState: RequestStates | null;
  data: Dict<any> | ReadonlyArray<any> | string | number | null;
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
