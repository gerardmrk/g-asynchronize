'use strict';

/* [INFO] Allow asynchronous control-flow within the given generator, by
 * wrapping it in a function that returns a Promise for anything it yields. */
Object.defineProperty(exports, '__esModule', {
  value: true
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

exports['default'] = asynchronize;

function asynchronize(generator) {
  return function () {
    return run.call(this, generator.apply(this, arguments));
  };
}

// [INFO] Collection of functions to convert a value to a Promise or run it.
var promisifiers = new Map([[isGeneratorFunction, run], [isGeneratorObject, run], [isFunction, promisifyThunk], [isArray, promisifyArray], [isObject, promisifyObject]]);

// [INFO] Conditionally converts given value to a Promise.
function promisify(value) {
  if (!value) {
    return value;
  }
  if (isPromise(value)) {
    return value;
  }
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = promisifiers[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var _step$value = _slicedToArray(_step.value, 2);

      var check = _step$value[0];
      var convert = _step$value[1];

      if (check(value)) {
        return convert.call(this, value);
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator['return']) {
        _iterator['return']();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return value;
}

// [INFO] Recursively iterate through the generator to promisify yielded values.
function run(generator) {

  // [INFO] Save context reference;
  var context = this;
  var args = [].slice.call(arguments, 1);

  // [INFO] Wrap generator up in a Promise.
  return new Promise(function (resolve, reject) {
    var iterator = undefined;

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
      var promisifiedValue = promisify.call(context, nextObject.value);
      if (promisifiedValue && isPromise(promisifiedValue)) {
        return promisifiedValue.then(onSuccess, onFailure);
      }
      return onFailure(new TypeError('Pls no yield primitive values, Maps, Sets, Symbols etc.'));
    }

    // [INFO] Standard callback for handling Promise fulfillment.
    function onSuccess(val) {
      var nextObject = undefined;
      try {
        nextObject = iterator.next(val);
      } catch (error) {
        return reject(error);
      }
      iterate(nextObject);
    }

    // [INFO] Standard callback for handling Promise error.
    function onFailure(error) {
      var nextObject = undefined;
      try {
        nextObject = iterator['throw'](error);
      } catch (error) {
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
  var _this = this;

  var results = new obj.constructor();
  var yieldables = Object.keys(obj);
  var promisifieds = [];

  var _loop = function (i, j) {
    var yieldable = yieldables[i];
    var promisified = promisify.call(_this, obj[yieldable]);
    if (promisified && isPromise(promisified)) {
      results[yieldable] = undefined;
      promisifieds.push(promisified.then(function (res) {
        results[yieldable] = res;
      }));
    } else {
      results[yieldable] = obj[yieldable];
    }
  };

  for (var i = 0, j = yieldables.length; i < j; i++) {
    _loop(i, j);
  }
  return Promise.all(promisifieds).then(function () {
    return results;
  });
}

// [INFO] Convert passed in array to a Promise.
function promisifyArray(arr) {
  return Promise.all(arr.map(promisify, this));
}

// [INFO] Convert passed in 'thunk' (function with callback) to a Promise.
function promisifyThunk(thunk) {
  var _arguments = arguments;

  var context = this;
  return new Promise(function (resolve, reject) {
    thunk.call(context, function (error, data) {
      if (error) {
        return reject(error);
      }
      if (_arguments.length > 2) {
        data = [].slice.call(_arguments, 1);
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
    return val !== null && (typeof val === 'object' || typeof val === 'function');
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
  return typeof val.next === 'function' && typeof val['throw'] === 'function';
}

// [INFO] Determine if passed in value is a plain function.
function isFunction(val) {
  return typeof val === 'function' && val.constructor.name !== 'GeneratorFunction';
}

// [INFO] Determine if passed in value is a plain object.
function isObject(val) {
  return val.constructor === Object;
}

// [INFO] Determine if passed in value is an array.
function isArray(val) {
  return Array.isArray(val);
}

exports.promisifiers = promisifiers;
exports.promisify = promisify;
exports.promisifyObject = promisifyObject;
exports.promisifyThunk = promisifyThunk;
exports.promisifyArray = promisifyArray;
exports.isPromise = isPromise;
exports.isGeneratorFunction = isGeneratorFunction;
exports.isGeneratorObject = isGeneratorObject;
exports.isFunction = isFunction;
exports.isObject = isObject;
exports.isArray = isArray;
exports.run = run;
exports.asynchronize = asynchronize;