'use strict';

'use strict';

/* [INFO] Allow asynchronous control-flow within the given generator, by
 * wrapping it in a function that returns a Promise for anything it yields. */
export default function asynchronize(generator) {
  return function() {
    return run.call(this, generator.apply(this, arguments));
  }
}

// [INFO] Collection of functions to convert a value to a Promise or run it.
const promisifiers = new Map([
  [isGeneratorFunction, run],
  [isGeneratorObject, run],
  [isFunction, promisifyThunk],
  [isArray, promisifyArray],
  [isObject, promisifyObject]
]);

// [INFO] Conditionally converts given value to a Promise.
function promisify(value) {
  if (!value) {
    return value;
  }
  if (isPromise(value)) {
    return value;
  }
  for (let [check, convert] of promisifiers) {
    if (check(value)) {
      return convert.call(this, value);
    }
  }
  return value;
}

// [INFO] Recursively iterate through the generator to promisify yielded values.
function run(generator) {

  // [INFO] Save context reference;
  let context = this;
  let args = [].slice.call(arguments, 1);

  // [INFO] Wrap generator up in a Promise.
  return new Promise((resolve, reject) => {
    let iterator;

    // [INFO] Consume generator's iterator if not yet invoked.
    if (typeof generator === 'function') {
      iterator = generator.apply(context, args);
    } else {
      iterator = generator;
    }

    // [INFO] Check during each recursion to determine if done iterating.
    if (!iterator || typeof iterator.next !== 'function') {
      return resolve(iterator);
    }

    // [INFO] Start generator's iterator.
    onSuccess();

    // [INFO] Promisify and resolve each yielded value.
    function iterate(nextObject) {
      if (nextObject.done) {
        return resolve(nextObject.value);
      }
      let promisifiedValue = promisify.call(context, nextObject.value);
      if (promisifiedValue && isPromise(promisifiedValue)) {
        return promisifiedValue.then(onSuccess, onFailure);
      }
      return onFailure(
        new TypeError('Pls no yield primitive values, Maps, Sets, Symbols etc.')
      );
    }

    // [INFO] Standard callback for handling Promise fulfillment.
    function onSuccess(val) {
      let nextObject;
      try {
        nextObject = iterator.next(val);
      } catch (error) {
        return reject(error);
      }
      iterate(nextObject);
    }

    // [INFO] Standard callback for handling Promise error.
    function onFailure(error) {
      let nextObject;
      try {
        nextObject = iterator.throw(error);
      } catch(error) {
        return reject(error);
      }
      iterate(nextObject);
    }
  });
}

/*==============================================================================
                                 PROMISIFIERS
==============================================================================*/

// [INFO] Convert passed in object of yieldables to a Promise.
function promisifyObject(obj) {
  let results = new obj.constructor();
  let yieldables = Object.keys(obj);
  let promisifieds = [];
  for (let i = 0, j = yieldables.length; i < j; i++) {
    let yieldable = yieldables[i];
    let promisified = promisify.call(this, obj[yieldable]);
    if (promisified && isPromise(promisified)) {
      results[yieldable] = undefined;
      promisifieds.push(promisified.then((res) => {
        results[yieldable] = res;
      }));
    } else {
      results[yieldable] = obj[yieldable];
    }
  }
  return Promise.all(promisifieds)
  .then(() => {
    return results;
  });
}

// [INFO] Convert passed in array to a Promise.
function promisifyArray(arr) {
  return Promise.all(arr.map(promisify, this));
}

// [INFO] Convert passed in 'thunk' (function with callback) to a Promise.
function promisifyThunk(thunk) {
  let context = this;
  return new Promise((resolve, reject) => {
    thunk.call(context, (error, data) => {
      if (error) {
        return reject(error);
      }
      if (arguments.length > 2) {
        data = [].slice.call(arguments, 1);
      }
      resolve(data);
    });
  });
}


/*==============================================================================
                                 TYPE_CHECKERS
==============================================================================*/

// [INFO] Determine if passed in value is a Promise.
function isPromise(val) {
  return isNotNullOrPrimitive(val) && hasThenMethod(val);
  function isNotNullOrPrimitive(val) {
    return val !== null && (
      typeof val === 'object' || typeof val === 'function'
    );
  }
  function hasThenMethod(val) {
    return typeof val.then === 'function';
  }
}

// [INFO] Determine if passed in value is a generator function.
function isGeneratorFunction(val) {
  if (val.constructor) {
    return val.constructor.name === 'GeneratorFunction';
  }
  return false;
}

// [INFO] Determine if passed in value is a generator object/iterator.
function isGeneratorObject(val) {
  return typeof val.next === 'function' && typeof val.throw === 'function';
}

// [INFO] Determine if passed in value is a plain function.
function isFunction(val) {
  return typeof val === 'function' &&
    val.constructor.name !== 'GeneratorFunction';
}

// [INFO] Determine if passed in value is a plain object.
function isObject(val) {
  return val.constructor === Object;
}

// [INFO] Determine if passed in value is an array.
function isArray(val) {
  return Array.isArray(val);
}

export {
  promisifiers,
  promisify,
  promisifyObject,
  promisifyThunk,
  promisifyArray,
  isPromise,
  isGeneratorFunction,
  isGeneratorObject,
  isFunction,
  isObject,
  isArray,
  run,
  asynchronize
};
