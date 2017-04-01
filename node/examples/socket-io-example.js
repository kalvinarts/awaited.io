'use strict';

let main = (() => {
  var _ref = _asyncToGenerator(function* () {

    // Setup a testing API
    const api = {

      // A silly sqrt function
      sqrt: function (ctx, num) {
        return Math.sqrt(num);
      },

      // The same dummy function, this time async
      delaySqrt: function (ctx, num, secs = 1) {
        return new Promise(function (f) {
          setTimeout(function () {
            f(Math.sqrt(num));
          }, 1000 * secs);
        });
      },

      // Some functions using a shared Map instance
      get: function (ctx, key) {
        return ctx.map.get(key);
      },
      set: function (ctx, key, value) {
        ctx.map.set(key, value);
      },
      has: function (ctx, key) {
        return ctx.map.has(key);
      }

    };

    // Setup a socket.io server
    const io = new SocketIO().listen(3131);

    // Setup the context that all API calls will share
    const ctx = {
      map: new Map()
    };

    io.on('connection', function (socket) {

      // Create an AwaitedIO instance to wrap the socket using the created context
      const aio = new AwaitedIO(socket, { ctx });

      // Register a middleware to debug things
      aio.use((() => {
        var _ref2 = _asyncToGenerator(function* (next, ctx, msg) {
          const now = new Date();
          yield next();
          const ms = new Date() - now;
          console.log(`-- call - ${msg.name} - ${ms}ms`);
        });

        return function (_x, _x2, _x3) {
          return _ref2.apply(this, arguments);
        };
      })());

      // Register the api functions
      aio.registerAPI(api);
    });

    // Let's create a client to connect to our API
    const socket = new ClientIO('http://localhost:3131');
    const aioClient = new AwaitedIO(socket);

    // Get the wrapped remote functions (also available at aioClient.remote once aioClient.update has been called)
    const remote = yield aioClient.update();

    // Test the sqrt functions
    console.log('-- response:', (yield remote.sqrt(16)));
    console.log('-- response:', (yield remote.delaySqrt(4, 2)));

    // Test the context functions
    yield remote.set('test', 1234567890);
    console.log('-- response:', (yield remote.has('test')));
    console.log('-- response:', (yield remote.get('test')));

    process.exit(0);
  });

  return function main() {
    return _ref.apply(this, arguments);
  };
})();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const AwaitedIO = require('../index.js');
const SocketIO = require('socket.io');
const ClientIO = require('socket.io-client');

main();
//# sourceMappingURL=socket-io-example.js.map