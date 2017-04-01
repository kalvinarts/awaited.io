'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// This awesome function comes from: https://gist.github.com/jed/982883
// Returns a random v4 UUID of the form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
function genUID(a) {
  return a ? (a ^ Math.random() * 16 >> a / 4).toString(16) : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, genUID);
};

var AwaitedIO = function () {
  function AwaitedIO(socket) {
    var _this = this;

    var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, AwaitedIO);

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
    // Apply options
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = Object.keys(opts)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var o = _step.value;

        if (opts.hasOwnProperty(o)) this[o] = opts[o];
      } // Register a listener for all the calls
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    socket.on('__' + this.namespace + '_call__', function (msg) {
      _this.chain(msg);
    });
    // Register a listener for all the returns
    socket.on('__' + this.namespace + '_return__', function (msg) {
      _this.calls = _this.calls.filter(function (call) {
        if (msg.id === call.id) {
          call.f(msg.response);
        }
      });
    });
    // Register a listener for all the errors
    socket.on('__' + this.namespace + '_error__', function (msg) {
      _this.calls = _this.calls.filter(function (call) {
        if (msg.id === call.id) {
          call.r(new Error(msg.response));
        }
      });
    });
    // Handle the internal call to update remote calls
    this.register('_update', function () {
      return _this.local;
    });
  }

  // Registers a middleware function for the incoming calls


  _createClass(AwaitedIO, [{
    key: 'use',
    value: function use(fn) {
      this.middleware.push(fn);
      return this;
    }

    // Executes the middleware chain passing the message along

  }, {
    key: 'chain',
    value: function () {
      var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(msg) {
        var _this2 = this;

        var index, next;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                index = 0;

                next = function () {
                  var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee(err) {
                    return regeneratorRuntime.wrap(function _callee$(_context) {
                      while (1) {
                        switch (_context.prev = _context.next) {
                          case 0:
                            if (!(index < _this2.middleware.length && !err)) {
                              _context.next = 6;
                              break;
                            }

                            index++;
                            _context.next = 4;
                            return _this2.middleware[index - 1](next, _this2.ctx, msg);

                          case 4:
                            _context.next = 7;
                            break;

                          case 6:
                            if (err) {
                              _this2.socket.emit('__' + _this2.namespace + '_error__', err.message);
                            }

                          case 7:
                          case 'end':
                            return _context.stop();
                        }
                      }
                    }, _callee, _this2);
                  }));

                  return function next(_x3) {
                    return _ref2.apply(this, arguments);
                  };
                }();

                return _context2.abrupt('return', next());

              case 3:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function chain(_x2) {
        return _ref.apply(this, arguments);
      }

      return chain;
    }()

    // Constructs the middleware function to handle a call

  }, {
    key: 'callback',
    value: function callback(name, handler) {
      var _this3 = this;

      return function () {
        var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(next, ctx, msg) {
          var response, message;
          return regeneratorRuntime.wrap(function _callee3$(_context3) {
            while (1) {
              switch (_context3.prev = _context3.next) {
                case 0:
                  if (!(msg.name === name)) {
                    _context3.next = 6;
                    break;
                  }

                  _context3.next = 3;
                  return handler.apply(undefined, [ctx].concat(_toConsumableArray(msg.args)));

                case 3:
                  response = _context3.sent;
                  message = {
                    id: msg.id,
                    response: response
                  };

                  _this3.socket.emit('__' + _this3.namespace + '_return__', message);

                case 6:
                  _context3.next = 8;
                  return next();

                case 8:
                  return _context3.abrupt('return', _context3.sent);

                case 9:
                case 'end':
                  return _context3.stop();
              }
            }
          }, _callee3, _this3);
        }));

        return function (_x4, _x5, _x6) {
          return _ref3.apply(this, arguments);
        };
      }();
    }

    // Registers a call to be remotely available

  }, {
    key: 'register',
    value: function register(name, handler) {
      this.local.push(name);
      return this.use(this.callback(name, handler));
    }

    // Registers a set of calls to be remotely available

  }, {
    key: 'registerAPI',
    value: function registerAPI(apiObj) {
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = Object.keys(apiObj)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var name = _step2.value;

          if (apiObj.hasOwnProperty(name)) this.register(name, apiObj[name]);
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }
    }

    // Makes a remote call

  }, {
    key: 'call',
    value: function call(name) {
      var _this4 = this;

      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      return new Promise(function (f, r) {
        var id = genUID();
        _this4.calls.push({ id: id, f: f, r: r });
        _this4.socket.emit('__' + _this4.namespace + '_call__', { id: id, name: name, args: args });
      });
    }

    // Updates the remote calls object

  }, {
    key: 'update',
    value: function () {
      var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5() {
        var _this5 = this;

        var remote;
        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                _context5.next = 2;
                return this.call('_update');

              case 2:
                remote = _context5.sent;

                // Reset the remote object
                this.remote = {};
                // Fill the remote object with the calls wrappers
                remote.forEach(function (name) {
                  _this5.remote[name] = _asyncToGenerator(regeneratorRuntime.mark(function _callee4() {
                    for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                      args[_key2] = arguments[_key2];
                    }

                    return regeneratorRuntime.wrap(function _callee4$(_context4) {
                      while (1) {
                        switch (_context4.prev = _context4.next) {
                          case 0:
                            _context4.next = 2;
                            return _this5.call.apply(_this5, [name].concat(_toConsumableArray(args)));

                          case 2:
                            return _context4.abrupt('return', _context4.sent);

                          case 3:
                          case 'end':
                            return _context4.stop();
                        }
                      }
                    }, _callee4, _this5);
                  }));
                });
                return _context5.abrupt('return', this.remote);

              case 6:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function update() {
        return _ref4.apply(this, arguments);
      }

      return update;
    }()
  }]);

  return AwaitedIO;
}();

module.exports = AwaitedIO;
//# sourceMappingURL=index.js.map