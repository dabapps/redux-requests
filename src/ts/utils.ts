import { AxiosPromise, AxiosResponse, default as axios } from 'axios';
import * as Cookies from 'js-cookie';
import * as path from 'path';
import {
  AsyncActionSet,
  Dict,
  RequestMetaData,
  ResponsesReducerState,
  ResponseState,
} from './types';

function asEntries<T>(params: Dict<T>): ReadonlyArray<[string, T]> {
  const result: Array<[string, T]> = [];
  for (const key in params) {
    if (params.hasOwnProperty(key)) {
      result.push([key, params[key]]);
    }
  }
  return result;
}

export function makeAsyncActionSet(actionName: string): AsyncActionSet {
  return {
    FAILURE: actionName + '_FAILURE',
    REQUEST: actionName + '_REQUEST',
    SUCCESS: actionName + '_SUCCESS',
  };
}

export function formatQueryParams<T>(params?: Dict<T>): string {
  if (!params) {
    return '';
  }

  const asPairs = asEntries(params);
  const filteredPairs = asPairs
    .filter(
      ([, value]: [string, T]) => value !== null && typeof value !== 'undefined'
    )
    .map(([key, value]) => [key, value.toString()]);

  if (!filteredPairs || !filteredPairs.length) {
    return '';
  }

  return '?' + filteredPairs.map(([key, value]) => `${key}=${value}`).join('&');
}

export function apiRequest(
  url: string,
  method: string,
  data = {},
  headers = {},
  onUploadProgress?: (event: ProgressEvent) => void
): AxiosPromise {
  const combinedHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'X-CSRFToken': Cookies.get('csrftoken'),
    ...headers,
  };

  let myPath;
  if (url.split(/:\/\//).length > 1) {
    myPath = url;
  } else {
    myPath = path.normalize(url);
  }

  return axios({
    method,
    url: myPath,
    data,
    headers: combinedHeaders,
    onUploadProgress,
  });
}

function isResponse(response?: any): response is AxiosResponse {
  return (
    typeof response === 'object' &&
    response.hasOwnProperty('data') &&
    response.hasOwnProperty('status') &&
    response.hasOwnProperty('config')
  );
}

export function metaWithResponse(
  meta: RequestMetaData,
  response?: AxiosResponse
) {
  if (!isResponse(response)) {
    return meta;
  }

  return { ...meta, response };
}

function getResponse(
  state: ResponsesReducerState,
  actionSet: AsyncActionSet,
  tag?: string
): ResponseState {
  return (state[actionSet.REQUEST] || {})[tag || ''] || {};
}
export function isPending(
  state: ResponsesReducerState,
  actionSet: AsyncActionSet,
  tag?: string
): boolean {
  return getResponse(state, actionSet, tag).requestState === 'REQUEST';
}

export function hasFailed(
  state: ResponsesReducerState,
  actionSet: AsyncActionSet,
  tag?: string
): boolean {
  return getResponse(state, actionSet, tag).requestState === 'FAILURE';
}

export function hasSucceeded(
  state: ResponsesReducerState,
  actionSet: AsyncActionSet,
  tag?: string
): boolean {
  return getResponse(state, actionSet, tag).requestState === 'SUCCESS';
}

export function anyPending(
  state: ResponsesReducerState,
  actionSets: ReadonlyArray<AsyncActionSet | [AsyncActionSet, string]>
): boolean {
  return actionSets.some(actionSet => {
    if (actionSet instanceof Array) {
      const [actualSet, tag] = actionSet;
      return isPending(state, actualSet, tag);
    } else {
      return isPending(state, actionSet);
    }
  });
}

export function getErrorData(
  state: ResponsesReducerState,
  actionSet: AsyncActionSet,
  tag?: string
): Dict<any> | ReadonlyArray<any> | string | number | null | undefined {
  if (hasFailed(state, actionSet, tag)) {
    return getResponse(state, actionSet, tag).data;
  }
}
