import { Dict } from '../src/ts/types';

interface AxiosMock {
  failure: (error: any) => any;
  success: (response: any) => any;
  catch: (fn: (...args: any[]) => any) => any;
  then: (fn: (...args: any[]) => any) => any;
  params: Dict<Dict<string> | undefined>;
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
    const myRequest = {
      catch(fn: (...args: any[]) => any) {
        failure = fn;
        return myRequest;
      },
      then(fn: (...args: any[]) => any, fail?: (...args: any[]) => any) {
        success = fn;
        failure = fail || (() => undefined);
        return myRequest;
      },
      failure(error: any) {
        return failure(error);
      },
      success(response: any) {
        return success(response);
      },
      params,
    };

    return myRequest;
  };

  (axiosDefault as any).defaults = { headers: { common: {} } };

  return {
    default: axiosDefault,
  };
});

import { requestWithConfig, setRequestState } from '../src/ts/actions';
import { apiRequest, formatQueryParams } from '../src/ts/utils';

import {
  anyPending,
  getErrorData,
  hasFailed,
  hasSucceeded,
  isPending,
  makeAsyncActionSet,
  request,
  REQUEST_STATE,
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
            tag: '',
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
            tag: '',
          },
          type: RESET_REQUEST_STATE,
        });
      });
    });

    describe('request', () => {
      const dispatch = jest.fn();
      const getState = jest.fn();
      const thunk = request(ACTION_SET, '/api/url/', METHOD);
      let myRequest: AxiosMock;

      beforeEach(() => {
        dispatch.mockReset();
        getState.mockReset();
      });

      it('should take a bunch of optional arguments', () => {
        const requestWithLotsOfParams = () =>
          request(ACTION_SET, '/api/url/', METHOD, {}, { tag: 'tag' });

        expect(requestWithLotsOfParams).not.toThrowError();
      });

      it('should allow for Header overrides', () => {
        const headerThunk = request(
          ACTION_SET,
          '/api/url',
          METHOD,
          {},
          { headers: { header1: 'blah' }, tag: 'tag' }
        );
        myRequest = (headerThunk(dispatch) as any) as AxiosMock;
        expect(
          myRequest.params.headers && myRequest.params.headers.header1
        ).toBe('blah');
      });

      it('should return a thunk for sending a generic request', () => {
        expect(typeof thunk).toBe('function');
      });
      it('should dispatch request actions', () => {
        myRequest = (thunk(dispatch) as any) as AxiosMock; // FIXME: We need type-safe mocking

        expect(dispatch).toHaveBeenCalledWith({
          meta: {
            tag: '',
          },
          type: ACTION_SET.REQUEST,
        });

        expect(dispatch).toHaveBeenCalledWith(
          setRequestState(ACTION_SET, 'REQUEST', null, undefined)
        );
      });

      it('should normalize URLs', () => {
        myRequest = request(ACTION_SET, '/api//llama/', METHOD)(
          dispatch
        ) as any;
        expect((myRequest as any).params.url).toEqual('/api/llama/');
      });

      it('should not normalize absolute URLs', () => {
        myRequest = request(ACTION_SET, 'http://www.test.com', METHOD)(
          dispatch
        ) as any;
        expect((myRequest as any).params.url).toEqual('http://www.test.com');
      });

      it('should dispatch success actions', () => {
        myRequest = (thunk(dispatch) as any) as AxiosMock;
        myRequest.success({
          data: 'llama',
        });

        expect(dispatch).toHaveBeenCalledWith({
          meta: {
            tag: '',
          },
          payload: { data: 'llama' },
          type: ACTION_SET.SUCCESS,
        });

        expect(dispatch).toHaveBeenCalledWith(
          setRequestState(ACTION_SET, 'SUCCESS', { data: 'llama' }, undefined)
        );
      });

      it('should dispatch failure actions', () => {
        myRequest = (thunk(dispatch) as any) as AxiosMock;
        const result = myRequest.failure({
          response: {
            data: 'llama',
          },
        });

        expect(dispatch).toHaveBeenCalledWith({
          meta: {
            tag: '',
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
        return result.then((data: any) => {
          expect(data).toBeUndefined();
        });
      });

      it('should be possible to force a rethrow', () => {
        myRequest = request(
          ACTION_SET,
          'http://www.test.com',
          METHOD,
          undefined,
          { shouldRethrow: () => true }
        )(dispatch) as any;
        return myRequest
          .failure({
            response: {
              data: 'llama',
            },
          })
          .catch((error: any) => {
            expect(error).toEqual({ response: { data: 'llama' } });
          });
      });
    });

    describe('requestWithConfig', () => {
      const thunk = requestWithConfig(ACTION_SET, {
        url: '/api/url/',
        method: METHOD,
      });
      const dispatch = jest.fn();

      it('should return a thunk for sending a generic request', () => {
        expect(typeof thunk).toBe('function');
      });
      it('should set url', () => {
        const myRequest = requestWithConfig(ACTION_SET, {
          url: 'http://www.test.com',
          method: METHOD,
        })(dispatch) as any;
        expect((myRequest as any).params.url).toEqual('http://www.test.com');
      });
      it('should set method', () => {
        const myRequest = requestWithConfig(ACTION_SET, {
          url: 'http://www.test.com',
          method: METHOD,
        })(dispatch) as any;
        expect((myRequest as any).params.method).toEqual(METHOD);
      });
      it('should take extra meta but not override the tag', () => {
        requestWithConfig(
          ACTION_SET,
          {
            url: 'http://www.test.com',
            method: METHOD,
          },
          { tag: 'example-tag' },
          { tag: 'meta-tag', extraData: 'more-data' }
        )(dispatch);
        expect(dispatch).toHaveBeenCalledWith({
          meta: { extraData: 'more-data', tag: 'example-tag' },
          type: 'REQUEST',
        });
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
        const responsesState: ResponsesReducerState<null> = {
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
        const responsesState: ResponsesReducerState<null> = {
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
        const responsesState: ResponsesReducerState<null> = {
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
        const responsesState: ResponsesReducerState<null> = {
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

        const responsesState2: ResponsesReducerState<null> = {
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

        const responsesState3: ResponsesReducerState<null> = {
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
        const responsesState: ResponsesReducerState<{ error: string }> = {
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

        const responsesState2: ResponsesReducerState<{ error: string }> = {
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
        expect(
          errorData && errorData.response && errorData.response.data
        ).toEqual({
          error: 'Error data!',
        });
      });

      it('should skip non-error data', () => {
        const responsesState: ResponsesReducerState<{ error: string }> = {
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
      const myRequest = apiRequest({
        url: 'http://localhost.com',
        method: 'GET',
      });
      const params = (myRequest as any).params;
      expect(params.params).toEqual({});
      expect(params.headers).not.toBeUndefined();
      expect(params).not.toHaveProperty('data');
    });

    it('should not modify url if not provided', () => {
      const myRequest = apiRequest({
        method: 'GET',
      });
      const params = (myRequest as any).params;
      expect(params.url).toEqual(undefined);
    });

    it('should provide defaults for data and headers - POST', () => {
      const myRequest = apiRequest({
        url: 'http://localhost.com',
        method: 'POST',
      });
      const params = (myRequest as any).params;
      expect(params.data).toEqual({});
      expect(params.headers).not.toBeUndefined();
    });

    it('should carry forward our provided data - GET', () => {
      const myRequest = apiRequest({
        url: 'http://localhost.com',
        method: 'GET',
        data: { a: 1 },
        headers: { b: 2 },
      });
      const params = (myRequest as any).params;
      expect(params.params).toEqual({ a: 1 });
      expect(params.headers.b).toBe(2);
      expect(params).not.toHaveProperty('data');
    });

    it('should carry forward our provided data - POST', () => {
      const myRequest = apiRequest({
        url: 'http://localhost.com',
        method: 'POST',
        data: { a: 1 },
        headers: { b: 2 },
      });
      const params = (myRequest as any).params;
      expect(params.data).toEqual({ a: 1 });
      expect(params.headers.b).toBe(2);
    });
  });
});
