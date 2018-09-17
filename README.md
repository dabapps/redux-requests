# Redux Requests

[![Build Status](https://travis-ci.com/dabapps/redux-requests.svg?token=YbH3f6uroz5f5q8RxDdW&branch=master)](https://travis-ci.com/dabapps/redux-requests)

Simple requests handling, extracted from Redux API Collections

## Installation
Install via NPM:

```
npm install @dabapps/redux-requests --save
```

To install you will need the company npm token set in your env `NPM_TOKEN=` and also add an `./npmrc` file (the same as the one included here), to be able to authenticate with NPM Private Repos.

## Getting Started
You will need Redux-Thunk installed in your project for actions to be correctly dispatched.

When defining a new request, you will need to first define an actionset, using `makeAsyncActionSet(ACTION_NAME)`.  This will give you a set of three actions that your reducers can then key off of.

Launching an action is as simple as calling `dispatchGenericRequest`, with the actionset as the first argument, then the URL, then the method, and then the data.  There are also three optional arguments

* `tag` - for name-spacing requests if you plan to make multiple calls to the same point with different parameters.
* `meta` - for storing additional data about the request that will not be forwarded to the server.
* `headers` - for allowing the setting of custom headers on the request.

Once launched, individual actions for REQUEST, SUCCESS and FAILURE will be dispatched, as well as actions to control the REQUEST_STATE, which is consumed by `responsesReducer`, should you choose to use it.

## Keeping track of request states

If you do not plan to keep track of the state of requests yourself, we also provide a helper reducer, plus some additional actions for managing its state.

Mount `responsesReducer` in your store, with the type `ResponsesReducerState`.  This will keep track of all requests, accessible via the helper functions `isPending`, `hasFailed`, `hasSucceeded`, and `anyPending`.  An action called `resetRequestState` can be fired to clear out any stored data.
