import axios, { AxiosError, AxiosPromise, AxiosRequestConfig } from 'axios';
import * as Cookies from 'js-cookie';
import * as path from 'path';
import {
  AsyncActionSet,
  Dict,
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
    .map(([key, value]) => [key, `${value}`]);

  if (!filteredPairs || !filteredPairs.length) {
    return '';
  }

  return '?' + filteredPairs.map(([key, value]) => `${key}=${value}`).join('&');
}

export function apiRequest<T = void>(
  options: AxiosRequestConfig
): AxiosPromise<T> {
  const combinedHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'X-CSRFToken': Cookies.get('csrftoken'),
    ...options.headers,
  };

  const url = options.url;
  let myPath;
  if (url) {
    if (url.split(/:\/\//).length > 1) {
      myPath = url;
    } else {
      myPath = path.normalize(url);
    }
  }

  const config = {
    ...options,
    url: myPath,
    headers: combinedHeaders,
    data: options.data || {},
  };

  // Axios uses a different key for sending data on a GET request
  if (options.method === 'GET') {
    const { data, ...getConfig } = config;
    return axios({
      ...getConfig,
      params: data,
    });
  }
  return axios(config);
}

function getResponseState<T>(
  state: ResponsesReducerState<T>,
  actionSet: AsyncActionSet,
  tag?: string
): ResponseState<T> {
  return (state[actionSet.REQUEST] || {})[tag || ''] || {};
}
export function isPending<T>(
  state: ResponsesReducerState<T>,
  actionSet: AsyncActionSet,
  tag?: string
): boolean {
  return getResponseState(state, actionSet, tag).requestState === 'REQUEST';
}

export function hasFailed<T>(
  state: ResponsesReducerState<T>,
  actionSet: AsyncActionSet,
  tag?: string
): boolean {
  return getResponseState(state, actionSet, tag).requestState === 'FAILURE';
}

export function hasSucceeded<T>(
  state: ResponsesReducerState<T>,
  actionSet: AsyncActionSet,
  tag?: string
): boolean {
  return getResponseState(state, actionSet, tag).requestState === 'SUCCESS';
}

export function anyPending<T>(
  state: ResponsesReducerState<T>,
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

export function getErrorData<T>(
  state: ResponsesReducerState<T>,
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
