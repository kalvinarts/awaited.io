'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

// This awesome function comes from: https://gist.github.com/jed/982883
// Returns a random v4 UUID of the form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
function genUID(a) {
  return a ? (a ^ Math.random() * 16 >> a / 4).toString(16) : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, genUID);
};

class ExtendableError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error(message).stack;
    }
  }
}

class AwaitedIOError extends ExtendableError {
  constructor(msg, stack) {
    super(msg);
    if (stack) this.stack = stack;
  }
}

class AwaitedIO {

  constructor(socket, opts = {}) {
    // The socket.io instance
    this.socket = socket;
    // Context to be passed to all calls
    this.ctx = {};
    // The namespace for the calls
    this.namespace = 'awaited.io';
    // The actions chain to process incoming calls
    this.middleware = [];
    // The enqueued calls
    this.calls = [];
    // The local calls available
    this.local = [];
    // The remote calls available
    this.remote = {};
    // Debug flag.
    // If set to true any errors thrown by the exposed methods will
    // be sent to the client. 
    // Errors returned by the middleware function are always sent
    // to the client but if the debug flag is not set the stack
    // trace will be stripped from the error 
    this.debug = false;
    for (let o of Object.keys(opts)) if (opts.hasOwnProperty(o)) this[o] = opts[o];
    // Register a listener for all the calls
    socket.on(`__${this.namespace}_call__`, msg => {
      this.chain(msg);
    });
    // Register a listener for all the returns
    socket.on(`__${this.namespace}_return__`, msg => {
      this.calls = this.calls.filter(call => {
        if (msg.id === call.id) {
          call.f(msg.response);
        }
      });
    });
    // Register a listener for all the errors
    socket.on(`__${this.namespace}_error__`, msg => {
      this.calls = this.calls.filter(call => {
        if (msg.id === call.id) {
          call.r(new AwaitedIOError(msg.response.message, msg.response.stack));
        }
      });
    });
    // Handle the internal call to update remote calls
    this.register('_update', () => {
      return this.local;
    });
  }

  // Registers a middleware function for the incoming calls
  use(fn) {
    this.middleware.push(fn);
    return this;
  }

  // Executes the middleware chain passing the message along
  chain(msg) {
    var _this = this;

    return _asyncToGenerator(function* () {
      let index = 0;
      const next = (() => {
        var _ref = _asyncToGenerator(function* (err) {
          if (index < _this.middleware.length && !err) {
            index++;
            yield _this.middleware[index - 1](next, _this.ctx, msg);
          } else if (err) {
            const error = {
              message: err.message
            };
            if (_this.debug) error.stack = err.stack;
            _this.socket.emit(`__${_this.namespace}_error__`, error);
          }
        });

        return function next(_x) {
          return _ref.apply(this, arguments);
        };
      })();
      return next();
    })();
  }

  // Constructs the middleware function to handle a call
  callback(name, handler) {
    var _this2 = this;

    return (() => {
      var _ref2 = _asyncToGenerator(function* (next, ctx, msg) {
        if (msg.name === name) {
          try {
            let response = yield handler(ctx, ...msg.args);
            let message = {
              id: msg.id,
              response
            };
            _this2.socket.emit(`__${_this2.namespace}_return__`, message);
          } catch (err) {
            if (debug) return yield next(err);else throw err;
          }
        }
        return yield next();
      });

      return function (_x2, _x3, _x4) {
        return _ref2.apply(this, arguments);
      };
    })();
  }

  // Registers a call to be remotely available
  register(name, handler) {
    this.local.push(name);
    return this.use(this.callback(name, handler));
  }

  // Registers a set of calls to be remotely available
  registerAPI(apiObj) {
    for (let name of Object.keys(apiObj)) {
      if (apiObj.hasOwnProperty(name)) this.register(name, apiObj[name]);
    }
  }

  // Makes a remote call
  call(name, ...args) {
    return new Promise((f, r) => {
      let id = genUID();
      this.calls.push({ id, f, r });
      this.socket.emit(`__${this.namespace}_call__`, { id, name, args });
    });
  }

  // Updates the remote calls object
  update() {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      // Get the remote calls names
      let remote = yield _this3.call('_update');
      // Reset the remote object
      _this3.remote = {};
      // Fill the remote object with the calls wrappers
      remote.forEach(function (name) {
        _this3.remote[name] = (() => {
          var _ref3 = _asyncToGenerator(function* (...args) {
            return yield _this3.call(name, ...args);
          });

          return function () {
            return _ref3.apply(this, arguments);
          };
        })();
      });
      return _this3.remote;
    })();
  }

}

module.exports = AwaitedIO;
//# sourceMappingURL=index.js.map