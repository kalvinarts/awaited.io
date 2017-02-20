const AwaitedIO = require('../index.js');
const SocketIO = require('socket.io');
const ClientIO = require('socket.io-client');

async function main() {

  // Setup a testing API
  const api = {
    
    // A silly sqrt function
    sqrt: (ctx, num) => Math.sqrt(num),

    // The same dummy function, this time async
    delaySqrt: (ctx, num, secs = 1) => {
      return new Promise (f => {
        setTimeout(() => {
          f(Math.sqrt(num))
        }, 1000 * secs);
      })
    },

    // Some functions using a shared Map instance
    get: (ctx, key) => {
      return ctx.map.get(key);
    },
    set: (ctx, key, value) => {
      let old = ctx.map.get(key);
      ctx.map.set(key, value);
    },
    has: (ctx, key) => {
      return ctx.map.has(key);
    }
  
  };

  // Setup a socket.io server
  const io = new SocketIO().listen(3131);

  // Setup the context that all API calls will share
  const ctx = {
    map: new Map()
  };

  io.on('connection', socket => {

    // Create an AwaitedIO instance to wrap the socket using the created context
    const server = new AwaitedIO(socket, { ctx });

    // Register a middleware to debug things
    server.use(async (next, ctx, msg) => {
      const now = new Date();
      await next();
      const ms = new Date - now;
      console.log(`${msg.name} - ${ms}ms`);
    });

    // Register the api functions
    for (let name of Object.keys(api)) {
      if (api.hasOwnProperty(name))
        server.register(name, api[name]);
    }

  });

  // Let's create a client to connect to our API
  const socket = new ClientIO('http://localhost:3131');
  const client = new AwaitedIO(socket);

  // Update the remote functions
  const remote = await client.update();
  
  // Test the sqrt functions
  console.log('-- response:', await remote.sqrt(16));
  console.log('-- response:', await remote.delaySqrt(4, 2));

  // Test the context functions
  await remote.set('test', 1234567890);
  console.log('-- response:', await remote.has('test'));
  console.log('-- response:', await remote.get('test'));

  process.exit(0);
}

main();
