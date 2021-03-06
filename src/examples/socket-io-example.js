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
      ctx.map.set(key, value);
    },
    has: (ctx, key) => {
      return ctx.map.has(key);
    },
  
    // Test error handling
    crash: (ctx, error) => {
      throw(new Error(error));
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
    const aio = new AwaitedIO(socket, { 
      debug: true,  // Errors will be sent to the client
      ctx 
    });

    // Register a middleware to debug things
    aio.use(async (next, ctx, msg) => {
      const now = new Date();
      await next();
      const ms = new Date() - now;
      console.log(`-- call - ${msg.name} - ${ms}ms`);
    });

    // Register the api functions
    aio.registerAPI(api)

  });

  // Let's create a client to connect to our API
  const socket = new ClientIO('http://localhost:3131');
  const aioClient = new AwaitedIO(socket);

  // Get the wrapped remote functions (also available at aioClient.remote once aioClient.update has been called)
  const remote = await aioClient.update();
  
  console.log('- Remote exposes: ', Object.keys(remote));

  // Test the sqrt functions
  console.log('-- response:', await remote.sqrt(16));
  console.log('-- response:', await remote.delaySqrt(4, 2));

  // Test the context functions
  await remote.set('test', 1234567890);
  console.log('-- response:', await remote.has('test'));
  console.log('-- response:', await remote.get('test'));
  
  // Test error handling (debug: true)
  try {
    await remote.crash('Please crash ;)')
  } catch (err) {
    console.log('-- error:', err.stack);
  }

  process.exit(0);
}

main();
