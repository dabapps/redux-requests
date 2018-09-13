import { Dispatch } from 'redux';
import {
  AsyncActionSet,
  Dict,
  RequestMetaData,
  RequestStates,
  UrlMethod,
} from './types';
import { apiRequest, metaWithResponse } from './utils';

export const REQUEST_STATE = 'REQUEST_STATE';
export function setRequestState(
  actionSet: AsyncActionSet,
  requestState: RequestStates,
  data: any,
  tag?: string
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
export function resetRequestState(actionSet: AsyncActionSet, tag?: string) {
  return {
    payload: {
      actionSet,
      tag,
    },
    type: RESET_REQUEST_STATE,
  };
}

export function dispatchGenericRequest(
  actionSet: AsyncActionSet,
  url: string,
  method: UrlMethod,
  data?: any,
  tag?: string,
  metaData: RequestMetaData = {},
  headers: Dict<string> = {}
) {
  return (dispatch: Dispatch<any>) => {
    const meta: RequestMetaData = { ...metaData, tag };

    dispatch({ type: actionSet.REQUEST, meta });
    dispatch(setRequestState(actionSet, 'REQUEST', null, tag));

    return apiRequest(url, method, data, headers)
      .then(response => {
        dispatch({
          type: actionSet.SUCCESS,
          payload: response,
          meta: metaWithResponse(meta, response),
        });
        dispatch(setRequestState(actionSet, 'SUCCESS', response, tag));
        return response;
      })
      .catch(error => {
        dispatch({
          type: actionSet.FAILURE,
          payload: error,
          meta: metaWithResponse(meta, error),
          error: true,
        });
        dispatch(setRequestState(actionSet, 'FAILURE', error, tag));
        return Promise.reject(error);
      });
  };
}
