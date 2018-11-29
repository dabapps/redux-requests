# Redux Requests

[![Build Status](https://travis-ci.com/dabapps/redux-requests.svg?token=YbH3f6uroz5f5q8RxDdW&branch=master)](https://travis-ci.com/dabapps/redux-requests)

Library for simple redux requests

## Disclaimer

This module is in its early stages and until it reaches its first major version it may be unstable, with potentially breaking changes with new minor version releases.

Patch version changes will include both minor changes and patches.

## Installation

Install via NPM:

```shell
npm install @dabapps/redux-requests --save
```

If you are using a version of npm that doesn't support package lock files, we'd recommend installing with the `--save-exact` flag to pin to a specific version in your package.json.

## Getting Started

### Prerequisites

You will need redux-thunk installed and applied as a middleware for actions to be correctly dispatched.

### Creating request actions

When defining a new request, you will need to first define an actionset, using `makeAsyncActionSet`.  This will give you a set of three actions that your reducers can then key off of.

```typescript
const GET_USER = makeAsyncActionSet('GET_USER');

/*
{
  REQUEST: 'GET_USER_REQUEST',
  SUCCESS: 'GET_USER_SUCCESS',
  FAILURE: 'GET_USER_FAILURE'
}
*/
```

Launching an action is as simple as calling `request`, with the actionset as the first argument, then the URL, then the method, and then the data.

This returns a thunk action, and should be returned from an action creator, as below.

```typescript
const getUser = (data) => {
  return request(GET_USER, '/api/user/', 'GET', data);
};
```

`request` also takes an additional argument - a dictionary with the following optional keys:

* `tag` - for name-spacing requests if you plan to make multiple calls to the same point with different parameters.
* `metaData` - for storing additional data about the request that will not be forwarded to the server.
* `headers` - for allowing the setting of custom headers on the request.
* `shouldRethrow` - a callback that takes the error object, and can return `true` if you want the Promise to fail instead of digest the error.

```typescript
const getUser = (data) => {
  return request(GET_USER, '/api/user/', 'GET', data, {
    tag: 'users-list',
    headers: {Authorization: TOKEN}
  });
};
```

Once launched, individual actions for `REQUEST`, `SUCCESS` and `FAILURE` will be dispatched, as well as actions to control the `REQUEST_STATE`, which is consumed by `responsesReducer`, should you choose to use it.

Internally, `request` uses a function called `requestFromFunction`, which instead wraps a callback that produces an Axios request.  You can use this in advance cases, if you need finer-grained control over how the request is made.

```typescript
request(GET_USER, () => axios({ /* some config */}), additionalConfig);
```


### Keeping track of request states and errors

If you do not plan to keep track of the state of requests yourself, we also provide a helper reducer, plus some additional actions for managing its state.

Mount `responsesReducer` in your store, with the type `ResponsesReducerState`.  This will keep track of all requests, accessible via the helper functions `isPending`, `hasFailed`, `hasSucceeded`, `anyPending`, and `getErrorData`.  An action called `resetRequestState` can be fired to clear out any stored data.


```typescript
interface StoreState {
  responses: ResponsesReducerState;
}

const store = createStore(combineReducers({
  responses: responsesReducer
}));
```

To access loading states and error messages with react-redux, you can use the various helper functions within your `mapStateToProps` function.

```typescript
function mapStateToProps (state: StoreState) {
  return {
    userIsLoading: isPending(state.responses, GET_USER),
    anythingIsLoading: anyPending(state.responses, [UPDATE_USER, GET_USER]),
    hasErrors: hasFailed(state.responses, GET_USER),
    errors: getErrorData(state.responses, GET_USER)
  };
}
```

### Keeping track of request data

To store response data you will need to create a custom reducer that handles the various request states.

Here you can handle transforming the responses, and clearing data, for example, upon request, or if a request fails.

```typescript
function user (state: User | null = null, action: AnyAction) {
  switch (action.type) {
    case GET_USER.SUCCESS:
      return action.payload.data;
    case GET_USER.REQUEST:
    case GET_USER.FAILURE:
      return null;
    default:
      return state;
  }
}
```

## Code of conduct

For guidelines regarding the code of conduct when contributing to this repository please review [https://www.dabapps.com/open-source/code-of-conduct/](https://www.dabapps.com/open-source/code-of-conduct/)
