# awaited.io
### A minimalistic socket.io RPC using async/await

### Install

I will wait until the module its properly tested to publish it to npm. Meantime:

`npm install git+https://github.com/kalvinarts/awaited.io.git#master`

### Usage - server

Let's make a simple server that exposes an API to operate the new ES6 Map object.

The Map will be exposed to our API functions via a shared context so all the clients connecting with our RPC server will access the same Map instance.

```javascript

const AwaitedIO = require('awaited.io');
const SocketIO  = require('socket.io');

const api   = {}
api.mapHas  = (ctx, key) => ctx.map.has(key);
api.mapGet  = (ctx, key) => ctx.map.get(key);
api.mapSet  = (ctx, key, value) => ctx.map.set(key, value);

const ctx   = {
  map: new Map()
};

const io = new SocketIO().listen(3131);

io.on('connection', socket => {

  const aio = new AwaitedIO(socket, { ctx });

  aio.registerAPI(api);

});

```

### Usage - client

Now let's make a client to connect to our remote API

```javascript

const AwaitedIO = require('awaited.io');
const ClientIO  = require('socket.io-client');

async function main () {

  const socket    = new ClientIO('http://localhost:3131');
  const aioClient = new AwaitedIO(socket);

  const remote = await aioClient.update();

  await remote.mapSet('foo', 'bar');
  console.log('-- response:', await remote.mapHas('foo'));
  // -- response: true
  console.log('-- response:', await remote.mapGet('foo'));
  // -- response: bar

}

main();

```

That's it ;)

### Registering functions

To register functions to be exposed to the client side you can use the `register` and the `registerAPI` methods.

Registered functions that return a Promise will be wait until the promise is resolved or rejected to send its response to the client side.

```javascript
// Register a single method
aio.register('add', (ctx, a, b) => a+b);

// Register multiple methods at once
aio.registerAPI({
  sqrt        : (ctx, num) => Math.sqrt(num),
  delaySqrt   : (ctx, secs, num) => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(Math.sqrt(num))
      }, secs * 1000)
    });
  }
});
```

### Middleware

Awaited.io allows to set middleware functions on the server side. The middleware chain is executed in the same order it's declared.

When you register a method to be exposed to the client side it is internally atached to the middleware chain, so if you want your middleware functions to be executed before the response is sent to the client make sure you atach them before registering your exposed methods.

The middleware functions __MUST__ be `async`.

These functions get three arguments:

__next__ : _function (err)_ - This function __MUST ALWAYS__ be called somewhere in the middleware function. If an error is passed the execution of the middleware chain will stop and the error will be passed to the client side which will reject the `Promise` returned by the remote function call.

__ctx__ : _object_ - The shared context

__msg__ : _object_ - The message passed from the client, which will look like:
```javascript

{
  id    : 'dc60f70e-bcb8-4b7c-bf1b-9da460733c8a',
  name  : 'mapSet',
  args  : ['foo', 'bar']
}

```

Examples:

```javascript

// Middleware to log the API calls and the time taken to respond
aio.use(async (next, ctx, msg) => {

  const now = new Date(); 
  await next(); // Await for the middleware chain to end execution

  const ms = new Date() - now;
  console.log(`-- ${msg.id} - ${msg.name} - ${ms}ms`);

});

// Middleware to block access to certain functions if the user is not an administrator
const adminFuncs = [ 'addUser', 'deleteUser', 'editUser' ]
const user = { isAdmin: false };
aio.use(async (next, ctx, msg) => {

  for (let func in adminFuncs) {
    if (msg.name === func && !user.isAdmin) {
      return await next(
        new Error(`Unauthorized call of method ${msg.name}`)
      );
    }
  }
  await next();

});

```

### Browser

A _browser version_ of the module is located under the `browser` directory of the project, but the recommended way is to use the _node version_ (which is exported by default) along with babel to ensure it works with your frontend project.