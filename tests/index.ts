interface AxiosMock {
  failure: (error: any) => any;
  success: (response: any) => any;
  catch: (fn: (...args: any[]) => any) => any;
  then: (fn: (...args: any[]) => any) => any;
  params: any;
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
import { setRequestState } from '../src/ts/actions';
import {
  apiRequest,
  formatQueryParams,
  metaWithResponse,
} from '../src/ts/utils';

import {
  anyPending,
  dispatchGenericRequest,
  getErrorData,
  hasFailed,
  hasSucceeded,
  isPending,
  makeAsyncActionSet,
  REQUEST_STATE,
  RequestMetaData,
  RESET_REQUEST_STATE,
  resetRequestState,
  responsesReducer,
  ResponsesReducerState,
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
          {}
        );

        expect(requestWithLotsOfParams).not.toThrowError();
      });

      it('should allow for Header overrides', () => {
        const headerThunk = dispatchGenericRequest(ACTION_SET, '/api/url', METHOD, {}, 'tag', {}, { 'header1': 'blah' });
        request = (headerThunk(dispatch) as any) as AxiosMock;
        expect(request.params.headers.header1).toBe('blah');
      });

      it('should return a thunk for sending a generic request', () => {
        expect(typeof thunk).toBe('function');
      });

      it('should dispatch request actions', () => {
        request = (thunk(dispatch) as any) as AxiosMock; // FIXME: We need type-safe mocking

        expect(dispatch).toHaveBeenCalledWith({
          meta: {
            tag: undefined,
          },
          type: ACTION_SET.REQUEST,
        });

        expect(dispatch).toHaveBeenCalledWith(
          setRequestState(ACTION_SET, 'REQUEST', null, undefined)
        );
      });

      it('should normalize URLs', () => {
        request = dispatchGenericRequest(ACTION_SET, '/api//llama/', METHOD)(
          dispatch
        ) as any;
        expect((request as any).params.url).toEqual('/api/llama/');
      });

      it('should not normalize absolute URLs', () => {
        request = dispatchGenericRequest(
          ACTION_SET,
          'http://www.test.com',
          METHOD
        )(dispatch) as any;
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
          payload: { data: 'llama' },
          type: ACTION_SET.SUCCESS,
        });

        expect(dispatch).toHaveBeenCalledWith(
          setRequestState(ACTION_SET, 'SUCCESS', { data: 'llama' }, undefined)
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
          payload: {
            response: {
              data: 'llama',
            },
          },
          type: ACTION_SET.FAILURE,
          error: true,
        });

        expect(dispatch).toHaveBeenCalledWith(
          setRequestState(
            ACTION_SET,
            'FAILURE',
            { response: { data: 'llama' } },
            undefined
          )
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
        ['tag', ''].forEach(tag => {
          const responsesState = responsesReducer(undefined, {
            payload: {
              actionSet: ACTION_SET,
              data: {},
              requestState: 'REQUEST',
              tag,
            },
            type: REQUEST_STATE,
          });
          expect(responsesState[ACTION_SET.REQUEST][tag]).toEqual({
            data: {},
            requestState: 'REQUEST',
          });
        });
      });

      it('should reset a response state', () => {
        ['tag', ''].forEach(tag => {
          const initial = responsesReducer(undefined, {
            payload: {
              actionSet: ACTION_SET,
              data: {},
              requestState: 'REQUEST',
              tag,
            },
            type: REQUEST_STATE,
          });

          [initial, undefined].forEach(value => {
            const responsesState = responsesReducer(value, {
              payload: {
                actionSet: ACTION_SET,
                tag,
              },
              type: RESET_REQUEST_STATE,
            });

            expect(responsesState[ACTION_SET.REQUEST][tag]).toEqual({
              data: null,
              requestState: null,
            });
          });
        });
      });

      it('should discard non-FSA actions', () => {
        const currentResponsesState = responsesReducer(undefined, {
          type: 'action',
        });

        [REQUEST_STATE, RESET_REQUEST_STATE].forEach(type => {
          const responsesState = responsesReducer(currentResponsesState, {
            llama: true,
            type,
          });

          expect(responsesState).toEqual(currentResponsesState);
        });
      });
    });
  });

  describe('utils', () => {
    describe('makeAsyncActionSet', () => {
      it('should generate an action set', () => {
        const result = makeAsyncActionSet('HELLO');
        expect(result).toEqual({
          FAILURE: 'HELLO_FAILURE',
          REQUEST: 'HELLO_REQUEST',
          SUCCESS: 'HELLO_SUCCESS',
        });
      });
    });

    describe('formatQueryParams', () => {
      it('should return an empty set if no params are provided', () => {
        const result = formatQueryParams();
        expect(result).toBe('');
      });

      it('should filter out unused values', () => {
        const result = formatQueryParams({ a: undefined, b: null });
        expect(result).toBe('');
      });

      it('should produce a query string', () => {
        const result = formatQueryParams({ a: '1', b: '2' });
        expect(result).toBe('?a=1&b=2');
      });

      it('should handle odd objects', () => {
        function dummy() {
          // Do nothing
        }
        dummy.prototype.b = '2';

        const params = new (dummy as any)();
        params.a = '1';
        const result = formatQueryParams(params);
        expect(result).toBe('?a=1');
      });
    });

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
                response: {
                  data: {
                    error: 'Error data!',
                  },
                  status: 500,
                  statusText: '',
                  config: {},
                  headers: {},
                },
                config: {},
                name: '',
                message: '',
              },
            },
          },
        };
        expect(getErrorData(responsesState, ACTION_SET, 'tag')).toBe(null);

        const responsesState2: ResponsesReducerState = {
          [ACTION_SET.REQUEST]: {
            tag: {
              requestState: 'FAILURE',
              data: {
                response: {
                  data: {
                    error: 'Error data!',
                  },
                  status: 500,
                  statusText: '',
                  config: {},
                  headers: {},
                },
                config: {},
                name: '',
                message: '',
              },
            },
          },
        };
        const errorData = getErrorData(responsesState2, ACTION_SET, 'tag');
        expect(errorData && errorData.response && errorData.response.data).toEqual({
          error: 'Error data!',
        });
      });

      it('should skip non-error data', () => {
        const responsesState: ResponsesReducerState = {
          [ACTION_SET.REQUEST]: {
            tag: {
              requestState: 'FAILURE',
              data: {
                data: {
                  error: 'Error data!',
                },
                status: 500,
                statusText: '',
                config: {},
                headers: {},
              },
            },
          },
        };
        expect(getErrorData(responsesState, ACTION_SET, 'tag')).toBe(null);
      });
    });
  });

  describe('apiRequest', () => {
    it('should provide defaults for data and headers - GET', () => {
      const request = apiRequest('http://localhost.com', 'GET');
      const params = (request as any).params;
      expect(params.params).toEqual({});
      expect(params.headers).not.toBeUndefined();
    });

    it('should provide defaults for data and headers - POST', () => {
      const request = apiRequest('http://localhost.com', 'POST');
      const params = (request as any).params;
      expect(params.data).toEqual({});
      expect(params.headers).not.toBeUndefined();
    });

    it('should carry forward our provided data - GET', () => {
      const request = apiRequest(
        'http://localhost.com',
        'GET',
        { a: 1 },
        { b: 2 }
      );
      const params = (request as any).params;
      expect(params.params).toEqual({ a: 1 });
      expect(params.headers.b).toBe(2);
    });

    it('should carry forward our provided data - POST', () => {
      const request = apiRequest(
        'http://localhost.com',
        'POST',
        { a: 1 },
        { b: 2 }
      );
      const params = (request as any).params;
      expect(params.data).toEqual({ a: 1 });
      expect(params.headers.b).toBe(2);
    });
  });
});
