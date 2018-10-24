import { AxiosError, AxiosResponse } from 'axios';
import { Dispatch } from 'redux';
import {
  AsyncActionSet,
  Dict,
  RequestMetaData,
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

// THIS FUNCTION IS DEPRECATED
export function dispatchGenericRequest(
  actionSet: AsyncActionSet,
  url: string,
  method: UrlMethod,
  data?: any,
  tag: string = '',
  metaData: Partial<RequestMetaData> = {},
  headers: Dict<string> = {}
) {
  return (dispatch: Dispatch<any>) => {
    const meta: RequestMetaData = { ...metaData, tag };

    dispatch({ type: actionSet.REQUEST, meta });
    dispatch(setRequestState(actionSet, 'REQUEST', null, tag));

    return apiRequest(url, method, data, headers)
      .then((response: AxiosResponse) => {
        dispatch({
          type: actionSet.SUCCESS,
          payload: response,
          meta,
        });
        dispatch(setRequestState(actionSet, 'SUCCESS', response, tag));
        return response;
      })
      .catch((error: AxiosError) => {
        dispatch({
          type: actionSet.FAILURE,
          payload: error,
          meta,
          error: true,
        });
        dispatch(setRequestState(actionSet, 'FAILURE', error, tag));
        return Promise.reject(error);
      });
  };
}

export function request(
  actionSet: AsyncActionSet,
  url: string,
  method: UrlMethod,
  params: RequestParams = {}
) {
  const { headers, data, metaData, tag, shouldRethrow } = params;

  return (dispatch: Dispatch<any>) => {
    const meta: RequestMetaData = { ...(metaData || {}), tag: tag || '' };

    dispatch({ type: actionSet.REQUEST, meta });
    dispatch(setRequestState(actionSet, 'REQUEST', null, tag || ''));

    return apiRequest(url, method, data, headers || {}).then(
      (response: AxiosResponse) => {
        dispatch({
          type: actionSet.SUCCESS,
          payload: response,
          meta,
        });
        dispatch(setRequestState(actionSet, 'SUCCESS', response, tag || ''));
        return response;
      },
      (error: AxiosError) => {
        dispatch({
          type: actionSet.FAILURE,
          payload: error,
          meta,
          error: true,
        });
        dispatch(setRequestState(actionSet, 'FAILURE', error, tag || ''));

        if (shouldRethrow && shouldRethrow(error)) {
          return Promise.reject(error);
        }
        return Promise.resolve();
      }
    );
  };
}
