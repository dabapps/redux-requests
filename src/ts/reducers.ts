import { isFSA } from 'flux-standard-action';
import { AnyAction } from 'redux';

import { REQUEST_STATE, RESET_REQUEST_STATE } from './actions';
import {
  ResetRequestStatePayload,
  ResponsesReducerState,
  SetRequestStatePayload,
} from './types';

export function responsesReducer<T = any>(
  state: ResponsesReducerState<T> = {},
  action: AnyAction
): ResponsesReducerState<T> {
  switch (action.type) {
    case REQUEST_STATE:
      if (isFSA(action)) {
        const {
          actionSet,
          requestState,
          tag,
          data,
        } = action.payload as SetRequestStatePayload;
        const existing = state[actionSet.REQUEST] || {};
        return {
          ...state,
          [actionSet.REQUEST]: {
            ...existing,
            [tag || '']: {
              requestState,
              data,
            },
          },
        };
      }
      break;
    case RESET_REQUEST_STATE:
      if (isFSA(action)) {
        const { actionSet, tag } = action.payload as ResetRequestStatePayload;
        const existing = state[actionSet.REQUEST] || {};
        return {
          ...state,
          [actionSet.REQUEST]: {
            ...existing,
            [tag || '']: {
              requestState: null,
              data: null,
            },
          },
        };
      }
      break;
    default:
      return state;
  }
  return state;
}
