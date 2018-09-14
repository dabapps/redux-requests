import { AxiosError, AxiosPromise, default as axios } from 'axios';
import * as Cookies from 'js-cookie';
import * as path from 'path';
import {
  AsyncActionSet,
  Dict,
  ResponsesReducerState,
  ResponseState,
  UrlMethod,
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
  method: UrlMethod,
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

  const config = {
    method,
    url: myPath,
    headers: combinedHeaders,
    onUploadProgress,
  };

  // Axios uses a different key for sending data on a GET request
  if (method === 'GET') {
    return axios({
      ...config,
      params: data,
    });
  }
  return axios({
    ...config,
    data,
  });
}

function getResponseState(
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
  return getResponseState(state, actionSet, tag).requestState === 'REQUEST';
}

export function hasFailed(
  state: ResponsesReducerState,
  actionSet: AsyncActionSet,
  tag?: string
): boolean {
  return getResponseState(state, actionSet, tag).requestState === 'FAILURE';
}

export function hasSucceeded(
  state: ResponsesReducerState,
  actionSet: AsyncActionSet,
  tag?: string
): boolean {
  return getResponseState(state, actionSet, tag).requestState === 'SUCCESS';
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

function isAxiosError(data: Dict<any>): data is AxiosError {
  return 'config' in data && 'name' in data && 'message' in data;
}

export function getErrorData(
  state: ResponsesReducerState,
  actionSet: AsyncActionSet,
  tag?: string
): AxiosError | null {
  if (hasFailed(state, actionSet, tag)) {
    const responseState = getResponseState(state, actionSet, tag);
    if (responseState.data && isAxiosError(responseState.data)) {
      return responseState.data;
    }
  }
  return null;
}
