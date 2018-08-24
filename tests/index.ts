interface AxiosMock {
  failure: (error: any) => any;
  success: (response: any) => any;
  catch: (fn: (...args: any[]) => any) => any;
  then: (fn: (...args: any[]) => any) => any;
}

jest.mock('axios', () => {
  let failure: (...args: any[]) => any;
  let success: (...args: any[]) => any;

  const axiosDefault = (params: {
    url: string;
    method: string;
    data: {};
    headers: {};
    onUploadProgress?: (event: ProgressEvent) => void;
  }) => {
    const request = {
      catch(fn: (...args: any[]) => any) {
        failure = fn;
        return request;
      },
      then(fn: (...args: any[]) => any) {
        success = fn;
        return request;
      },
      failure(error: any) {
        return failure(error);
      },
      success(response: any) {
        return success(response);
      },
      params,
    };

    return request;
  };

  (axiosDefault as any).defaults = { headers: { common: {} } };

  return {
    default: axiosDefault,
  };
});

import { AxiosResponse } from 'axios';
import {
  anyPending,
  dispatchGenericRequest,
  getErrorData,
  hasFailed,
  hasSucceeded,
  isPending,
  metaWithResponse,
  REQUEST_STATE,
  RequestMetaData,
  RESET_REQUEST_STATE,
  resetRequestState,
  responsesReducer,
  ResponsesReducerState,
  setRequestState,
} from '../src/ts/index';

describe('Requests', () => {
  const ACTION_SET = {
    FAILURE: 'FAILURE',
    REQUEST: 'REQUEST',
    SUCCESS: 'SUCCESS',
  };
  const OTHER_ACTION_SET = {
    FAILURE: 'FAILURE2',
    REQUEST: 'REQUEST2',
    SUCCESS: 'SUCCESS2',
  };

  describe('actions', () => {
    const METHOD = 'GET';
    const STATE = 'SUCCESS';

    describe('setRequestState', () => {
      it('should construct an action', () => {
        expect(setRequestState(ACTION_SET, STATE, 'hello', 'tag')).toEqual({
          payload: {
            actionSet: ACTION_SET,
            data: 'hello',
            requestState: STATE,
            tag: 'tag',
          },
          type: REQUEST_STATE,
        });

        expect(setRequestState(ACTION_SET, STATE, null)).toEqual({
          payload: {
            actionSet: ACTION_SET,
            data: null,
            requestState: STATE,
            tag: undefined,
          },
          type: REQUEST_STATE,
        });
      });
    });

    describe('resetRequestState', () => {
      it('should construct an action', () => {
        expect(resetRequestState(ACTION_SET, 'tag')).toEqual({
          payload: {
            actionSet: ACTION_SET,
            tag: 'tag',
          },
          type: RESET_REQUEST_STATE,
        });

        expect(resetRequestState(ACTION_SET)).toEqual({
          payload: {
            actionSet: ACTION_SET,
            tag: undefined,
          },
          type: RESET_REQUEST_STATE,
        });
      });
    });

    describe('dispatchGenericRequest', () => {
      const dispatch = jest.fn();
      const getState = jest.fn();
      const thunk = dispatchGenericRequest(ACTION_SET, '/api/url/', METHOD);
      let request: AxiosMock;

      beforeEach(() => {
        dispatch.mockReset();
        getState.mockReset();
      });

      it('should take a bunch of optional arguments', () => {
        const requestWithLotsOfParams = dispatchGenericRequest.bind(
          null,
          ACTION_SET,
          '/api/url/',
          METHOD,
          {},
          'tag',
          {},
          false
        );

        expect(requestWithLotsOfParams).not.toThrowError();
      });

      it('should return a thunk for sending a generic request', () => {
        expect(typeof thunk).toBe('function');
      });

      it('should dispatch request actions', () => {
        request = (thunk(dispatch, getState) as any) as AxiosMock; // FIXME: We need type-safe mocking

        expect(dispatch).toHaveBeenCalledWith({
          meta: {
            tag: undefined,
          },
          payload: {
            preserveOriginal: undefined,
          },
          type: ACTION_SET.REQUEST,
        });

        expect(dispatch).toHaveBeenCalledWith(
          setRequestState(ACTION_SET, 'REQUEST', null, undefined)
        );
      });

      it('should normalize URLs', () => {
        request = dispatchGenericRequest(ACTION_SET, '/api//llama/', METHOD)(
          dispatch,
          getState
        ) as any;
        expect((request as any).params.url).toEqual('/api/llama/');
      });

      it('should not normalize absolute URLs', () => {
        request = dispatchGenericRequest(
          ACTION_SET,
          'http://www.test.com',
          METHOD
        )(dispatch, getState) as any;
        expect((request as any).params.url).toEqual('http://www.test.com');
      });

      it('should dispatch success actions', () => {
        request.success({
          data: 'llama',
        });

        expect(dispatch).toHaveBeenCalledWith({
          meta: {
            tag: undefined,
          },
          payload: 'llama',
          type: ACTION_SET.SUCCESS,
        });

        expect(dispatch).toHaveBeenCalledWith(
          setRequestState(ACTION_SET, 'SUCCESS', 'llama', undefined)
        );
      });

      it('should dispatch failure actions', () => {
        request
          .failure({
            response: {
              data: 'llama',
            },
          })
          .catch(() => null);

        expect(dispatch).toHaveBeenCalledWith({
          meta: {
            tag: undefined,
          },
          payload: 'llama',
          type: ACTION_SET.FAILURE,
        });

        expect(dispatch).toHaveBeenCalledWith(
          setRequestState(ACTION_SET, 'FAILURE', 'llama', undefined)
        );
      });
    });

    describe('metaWithResponse', () => {
      const META: RequestMetaData = {};

      it('should return the same meta if the response is not valid', () => {
        expect(metaWithResponse(META, undefined)).toBe(META);
        expect(metaWithResponse(META, { data: {} } as AxiosResponse)).toBe(
          META
        );
        expect(metaWithResponse(META, { status: 200 } as AxiosResponse)).toBe(
          META
        );
        expect(metaWithResponse(META, { config: {} } as AxiosResponse)).toBe(
          META
        );
      });

      it('should return meta with response data if the response is valid', () => {
        const response = { data: {}, status: 200, config: {} } as AxiosResponse;
        const result = metaWithResponse(META, response);

        expect(result).not.toBe(META);
        expect(result).toEqual({ response });
      });
    });
  });

  describe('reducers', () => {
    describe('responsesReducer', () => {
      it('should return a default state', () => {
        const responsesState = responsesReducer(undefined, { type: 'action' });
        expect(responsesState).toEqual({});
      });

      it('should return the existing state if not modified', () => {
        const currentResponsesState = responsesReducer(undefined, {
          type: 'action',
        });
        const responsesState = responsesReducer(currentResponsesState, {
          type: 'action',
        });
        expect(responsesState).toBe(currentResponsesState);
      });

      it('should set a response state', () => {
        const responsesState = responsesReducer(undefined, {
          payload: {
            actionSet: ACTION_SET,
            data: {},
            requestState: 'REQUEST',
            tag: 'tag',
          },
          type: REQUEST_STATE,
        });
        expect(responsesState[ACTION_SET.REQUEST].tag).toEqual({
          data: {},
          requestState: 'REQUEST',
        });
      });

      it('should reset a response state', () => {
        const initial = responsesReducer(undefined, {
          payload: {
            actionSet: ACTION_SET,
            data: {},
            requestState: 'REQUEST',
            tag: 'tag',
          },
          type: REQUEST_STATE,
        });

        const responsesState = responsesReducer(initial, {
          payload: {
            actionSet: ACTION_SET,
            tag: 'tag',
          },
          type: RESET_REQUEST_STATE,
        });

        expect(responsesState[ACTION_SET.REQUEST].tag).toEqual({
          data: null,
          requestState: null,
        });
      });
    });
  });

  describe('utils', () => {
    describe('isPending', () => {
      it('should return true if a request is pending', () => {
        const responsesState: ResponsesReducerState = {
          [ACTION_SET.REQUEST]: {
            tag: {
              requestState: 'REQUEST',
              data: null,
            },
          },
        };
        expect(isPending(responsesState, ACTION_SET, 'not-tag')).toBe(false);
        expect(isPending(responsesState, ACTION_SET, 'tag')).toBe(true);
      });
    });

    describe('hasFailed', () => {
      it('should return true if a request has failed', () => {
        const responsesState: ResponsesReducerState = {
          [ACTION_SET.REQUEST]: {
            tag: {
              requestState: 'FAILURE',
              data: null,
            },
          },
        };

        expect(hasFailed(responsesState, ACTION_SET, 'not-tag')).toBe(false);
        expect(hasFailed(responsesState, ACTION_SET, 'tag')).toBe(true);
      });
    });

    describe('hasSucceeded', () => {
      it('should return true if a request has succeeded', () => {
        const responsesState: ResponsesReducerState = {
          [ACTION_SET.REQUEST]: {
            tag: {
              requestState: 'SUCCESS',
              data: null,
            },
          },
        };

        expect(hasSucceeded(responsesState, ACTION_SET, 'not-tag')).toBe(false);
        expect(hasSucceeded(responsesState, ACTION_SET, 'tag')).toBe(true);
      });
    });

    describe('anyPending', () => {
      it('should return true if any requests are pending', () => {
        const responsesState: ResponsesReducerState = {
          [ACTION_SET.REQUEST]: {
            tag: {
              requestState: 'REQUEST',
              data: null,
            },
          },
        };
        expect(
          anyPending(responsesState, [
            [ACTION_SET, 'tag'],
            [OTHER_ACTION_SET, 'tag'],
          ])
        ).toBe(true);

        const responsesState2: ResponsesReducerState = {
          [ACTION_SET.REQUEST]: {
            tag: {
              requestState: 'SUCCESS',
              data: null,
            },
          },
        };
        expect(
          anyPending(responsesState2, [
            [ACTION_SET, 'tag'],
            [OTHER_ACTION_SET, 'tag'],
          ])
        ).toBe(false);

        const responsesState3: ResponsesReducerState = {
          [ACTION_SET.REQUEST]: {
            tag: {
              requestState: 'SUCCESS',
              data: null,
            },
          },
          [OTHER_ACTION_SET.REQUEST]: {
            tag: {
              requestState: 'REQUEST',
              data: null,
            },
          },
        };
        expect(
          anyPending(responsesState3, [
            [ACTION_SET, 'tag'],
            [OTHER_ACTION_SET, 'tag'],
          ])
        ).toBe(true);
        expect(
          anyPending(responsesState3, [[ACTION_SET, 'tag'], OTHER_ACTION_SET])
        ).toBe(false);
      });
    });

    describe('getErrorData', () => {
      it('should return error data for a failed request', () => {
        const responsesState: ResponsesReducerState = {
          [ACTION_SET.REQUEST]: {
            tag: {
              requestState: 'REQUEST',
              data: {
                error: 'Error data!',
              },
            },
          },
        };
        expect(getErrorData(responsesState, ACTION_SET, 'tag')).toBe(undefined);

        const responsesState2: ResponsesReducerState = {
          [ACTION_SET.REQUEST]: {
            tag: {
              requestState: 'FAILURE',
              data: {
                error: 'Error data!',
              },
            },
          },
        };
        expect(getErrorData(responsesState2, ACTION_SET, 'tag')).toEqual({
          error: 'Error data!',
        });
      });
    });
  });
});
