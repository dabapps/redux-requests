import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Dispatch } from 'redux';
import {
  AsyncActionSet,
  Dict,
  ExtraMeta,
  Options,
  RequestParams,
  RequestStates,
  UrlMethod,
} from './types';
import { apiRequest } from './utils';

export const REQUEST_STATE = 'REQUEST_STATE';
export function setRequestState(
  actionSet: AsyncActionSet,
  requestState: RequestStates,
  data: any,
  tag: string = ''
) {
  return {
    payload: {
      actionSet,
      data,
      requestState,
      tag,
    },
    type: REQUEST_STATE,
  };
}

export const RESET_REQUEST_STATE = 'RESET_REQUEST_STATE';
export function resetRequestState(actionSet: AsyncActionSet, tag: string = '') {
  return {
    payload: {
      actionSet,
      tag,
    },
    type: RESET_REQUEST_STATE,
  };
}

function serializeMeta(meta: Partial<ExtraMeta>, options: Options): ExtraMeta {
  return {
    ...meta,
    tag: options.tag || '',
  };
}

export function requestWithConfig(
  actionSet: AsyncActionSet,
  axoisConfig: AxiosRequestConfig,
  options: Options = {},
  extraMeta: Partial<ExtraMeta> = {}
) {
  return (dispatch: Dispatch<any>) => {
    const serializedMeta = serializeMeta(extraMeta, options);

    dispatch({ type: actionSet.REQUEST, meta: serializedMeta });
    dispatch(setRequestState(actionSet, 'REQUEST', null, serializedMeta.tag));

    return apiRequest(axoisConfig).then(
      (response: AxiosResponse) => {
        dispatch({
          type: actionSet.SUCCESS,
          payload: response,
          meta: serializedMeta,
        });
        dispatch(
          setRequestState(actionSet, 'SUCCESS', response, serializedMeta.tag)
        );
        return response;
      },
      (error: AxiosError) => {
        const { shouldRethrow } = options;

        dispatch({
          type: actionSet.FAILURE,
          payload: error,
          meta: serializedMeta,
          error: true,
        });
        dispatch(
          setRequestState(actionSet, 'FAILURE', error, serializedMeta.tag)
        );

        if (shouldRethrow && shouldRethrow(error)) {
          return Promise.reject(error);
        }

        return Promise.resolve();
      }
    );
  };
}

export function request(
  actionSet: AsyncActionSet,
  url: string,
  method: UrlMethod,
  data?: string | number | Dict<any> | ReadonlyArray<any>,
  params: RequestParams = {}
) {
  const { headers, tag, metaData, shouldRethrow } = params;
  return requestWithConfig(
    actionSet,
    { url, method, data, headers },
    { tag, shouldRethrow },
    metaData
  );
}
