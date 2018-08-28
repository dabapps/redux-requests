import { Dispatch } from 'redux';
import {
  AsyncActionSet,
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
  preserveOriginal?: boolean
) {
  return (dispatch: Dispatch<any>) => {
    const meta: RequestMetaData = { ...metaData, tag };

    dispatch({ type: actionSet.REQUEST, meta, payload: { preserveOriginal } });
    dispatch(setRequestState(actionSet, 'REQUEST', null, tag));

    return apiRequest(url, method, data)
      .then(response => {
        dispatch({
          type: actionSet.SUCCESS,
          payload: response.data,
          meta: metaWithResponse(meta, response),
        });
        dispatch(setRequestState(actionSet, 'SUCCESS', response.data, tag));
        return response;
      })
      .catch(error => {
        console.error(error); // tslint:disable-line:no-console
        const errorData = error && error.response && error.response.data;
        dispatch({
          type: actionSet.FAILURE,
          payload: errorData,
          meta: metaWithResponse(meta, error && error.response),
        });
        dispatch(setRequestState(actionSet, 'FAILURE', errorData, tag));
        return Promise.reject(error);
      });
  };
}
