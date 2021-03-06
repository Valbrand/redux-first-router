import { createStore, applyMiddleware, compose } from 'redux'

import setup from '../__test-helpers__/setup'
import { push, replace, back, next } from '../src/connectRoutes'

it('push: verify client-only `push` function calls `history.push()` using history from enclosed state', () => {
  jest.useFakeTimers()
  const { enhancer, reducer, history, middleware, windowDocument } = setup(
    '/first'
  )

  const rootReducer = (state = {}, action = {}) => ({
    location: reducer(state.location, action),
    title: `title: ${action.type}`
  })

  const middlewares = applyMiddleware(middleware)
  const store = createStore(rootReducer, compose(enhancer, middlewares))

  push('/second/bar') // THIS IS THE TARGET OF THE TEST. Notice `push` is imported
  const { location } = store.getState()

  expect(location.type).toEqual('SECOND')
  expect(location.pathname).toEqual('/second/bar')

  jest.runAllTimers() // title set in next tick
  expect(windowDocument.title).toEqual('title: SECOND')

  expect(history.length).toEqual(2)
})

it('replace: verify client-only `replace` function calls `history.replace()` using history from enclosed state', () => {
  const { enhancer, reducer } = setup('/first')

  const createStore = reducer => ({
    // eslint-disable-line arrow-parens
    dispatch: jest.fn(),
    getState: () => reducer()
  })

  const rootReducer = (state = {}, action = {}) => ({
    location: reducer(state.location, action)
  })

  const store = enhancer(createStore)(rootReducer)

  replace('/second/bar')
  const action = store.dispatch.mock.calls[1][0] /*? */

  expect(action.type).toEqual('SECOND')
  expect(action.meta.location.current.pathname).toEqual('/second/bar')

  expect(window.history.length).toEqual(1) // key difference between this test and previous `push` test
})

it('back: verify client-only `back` and `next` functions call `history.goBack/goForward()` using history from enclosed state', () => {
  const { history, enhancer, reducer } = setup('/first')

  const createStore = reducer => ({
    // eslint-disable-line arrow-parens
    dispatch: jest.fn(),
    getState: () => reducer()
  })

  const rootReducer = (state = {}, action = {}) => ({
    location: reducer(state.location, action)
  })

  const store = enhancer(createStore)(rootReducer)

  history.push('/second/bar')
  let action = store.dispatch.mock.calls[1][0] /*? */

  expect(action.type).toEqual('SECOND')
  expect(action.meta.location.current.pathname).toEqual('/second/bar')

  back() // THIS IS WHAT WE ARE VERIFYING
  action = store.dispatch.mock.calls[2][0] /*? */

  expect(action.type).toEqual('FIRST')
  expect(action.meta.location.current.pathname).toEqual('/first')

  next() // THIS IS WHAT WE ARE VERIFYING
  action = store.dispatch.mock.calls[3][0] /*? */

  expect(action.type).toEqual('SECOND')
  expect(action.meta.location.current.pathname).toEqual('/second/bar')
})

it('verify window.document is not used server side', () => {
  window.isSSR = true
  jest.useFakeTimers()

  const { middleware, windowDocument, reducer, enhancer } = setup('/first')
  const middlewares = applyMiddleware(middleware)

  const rootReducer = (state = {}, action = {}) => ({
    location: reducer(state.location, action),
    title: `title: ${action.type}`
  })

  const store = createStore(rootReducer, compose(enhancer, middlewares))
  store.dispatch({ type: 'SECOND', payload: { param: 'foo' } })

  const originalTitle = document.title
  jest.runAllTimers() // title set in next tick
  expect(windowDocument.title).toEqual('title: SECOND') // fake document object used instead
  expect(document.title).toEqual(originalTitle)

  delete window.isSSR
})
