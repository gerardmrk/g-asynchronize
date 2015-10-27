'use strict';

const test = require('tape');

const {
  asynchronize,
  promisify,
  run,
  isPromise,
  isGeneratorObject,
  isGeneratorFunction,
  isFunction,
  isObject,
  isArray
} = require('../index');

const genFn = function* () { yield 1; yield 2; };
const genObj = genFn();
const fn = function(x) { return x * 2; };
const obj = { meeseeks() { return 'yolo'; }, swag() { return 'brah'; } };
const arr = [function(x) { return new Promise((resolve, reject) => {
  resolve(x);
}); }];

/*============================================================================*/
test('Type Checkers', (t) => {
  t.plan(5);
  t.test('isGeneratorFunction', (st) => {
    st.plan(2);
    st.ok(
      isGeneratorFunction(genFn),
      'should correctly validate a generator function'
    );
    st.ok(
      !isGeneratorFunction(genObj) &&
      !isGeneratorFunction(fn) &&
      !isGeneratorFunction(obj) &&
      !isGeneratorFunction(arr),
      'should correctly invalidate a generator object, a plain function, a \
      plain object and an array'
    );
    st.end();
  });
  t.test('isGeneratorObject', (st) => {
    st.plan(2);
    st.ok(
      isGeneratorObject(genObj),
      'should correctly validate a generator object'
    );
    st.ok(
      !isGeneratorObject(genFn) &&
      !isGeneratorObject(fn) &&
      !isGeneratorObject(obj) &&
      !isGeneratorObject(arr),
      'should correctly invalidate a generator function, a plain function, a \
      plain object and an array'
    );
    st.end();
  });
  t.test('isFunction', (st) => {
    st.plan(2);
    st.ok(
      isFunction(fn),
      'should correctly validate a plain function'
    );
    st.ok(
      !isFunction(genFn) &&
      !isFunction(genObj) &&
      !isFunction(obj) &&
      !isFunction(arr),
      'should correctly invalidate a generator function, a generator object, a \
      plain object and an array'
    );
    st.end();
  });
  t.test('isObject', (st) => {
    st.plan(2);
    st.ok(
      isObject(obj),
      'should correctly validate a plain obj'
    );
    st.ok(
      !isObject(genFn) &&
      !isObject(genObj) &&
      !isObject(fn) &&
      !isObject(arr),
      'should correctly invalidate a generator function, a generator object, a \
      plain function and an array'
    );
    st.end();
  });
  t.test('isArray', (st) => {
    st.plan(2);
    st.ok(
      isArray(arr),
      'should correctly validate an array'
    );
    st.ok(
      !isArray(genFn) &&
      !isArray(genObj) &&
      !isArray(fn) &&
      !isArray(obj),
      'should correctly invalidate a generator function, a generator object, a \
      plain function and a plain object'
    );
    st.end();
  });
  t.end();
});

/*============================================================================*/
test('promisify', (t) => {
  t.plan(6);
  t.ok(
    isPromise(promisify(genFn)),
    'should return a generator function as a Promise'
  );
  t.ok(
    isPromise(promisify(genObj)),
    'should return a generator object as a Promise'
  );
  t.ok(
    isPromise(promisify(fn)),
    'should return a plain function as a Promise'
  );
  t.ok(
    isPromise(promisify(obj)),
    'should return an object of yieldables as a Promise'
  );
  t.ok(
    isPromise(promisify(arr)),
    'should return an array of yieldables as a Promise'
  );
  t.notOk(
    isPromise(promisify(12)) && isPromise(promisify('no')),
    'should not promisify primitive values'
  );
  t.end();
});
