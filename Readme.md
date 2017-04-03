# awaited.io
## A minimalistic socket.io RPC using Promises and async/await

### Index

* [Install](#install)
* [Usage - server](#usage---server)
* [Usage - client](#usage---client)
* [Registering functions](#registering-functions)
* [Middleware](#middleware)
* [Calling functions from the client](#calling-functions-from-the-client)
* [Errors](#errors)
* [The client is a server and the server is a client](#the-client-is-a-server-and-the-server-is-a-client)
* [Browser](#browser)
* [Current state](#current-state)
* [License](#license)

### Install

`npm install awaited.io

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

__register__ : _function (name, func)_ - Registers a function to be exposed.

__registerAPI__ : _function (apiObj)_ - Registers a set of functions.

Examples:

Register a single method

```javascript
aio.register('add', (ctx, a, b) => a+b);
```

Register multiple methods at once

```javascript
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

Awaited.io allows you to set middleware functions on the server side. The middleware chain is executed in the same order it's declared.

When you register a function to be exposed to the client side it is internally atached to the middleware chain, so if you want your middleware to be executed before the response is sent to the client make sure you atach it before registering your exposed functions.

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

Middleware to log the API calls and the time taken to respond
```javascript
aio.use(async (next, ctx, msg) => {

  const now = new Date(); 
  await next(); // Await for the middleware chain to end execution

  const ms = new Date() - now;
  console.log(`-- ${msg.id} - ${msg.name} - ${ms}ms`);

});
```

Middleware to block access to certain functions if the user is not an administrator
```javascript
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

### Calling functions from the client

There are two ways of doing this.

Use the `call` method:

__call__ : _function (name, args...)_ - Calls the method `name` on the server side passing it `args...` as arguments.

```javascript
let result = await aioClient.call('sqrt', 4);
```

The other one is first call the `update` method wich will map the exposed function in the `remote` object of the instance and also return it:

```javascript
const remote = aioClient.update();

let result = await aioClient.remote.sqrt(4);
// =
let result = await remote.sqrt(4);
```

All remote function wrappers return promise so this is the same as the code above:

```javascript
iaoClient.update()
.then((remote) => {
  return aioClient.remote.sqrt(4);
})
.then((res) => {
  let result = res;
});
```

### Errors

If the `debug` option is set to false, which is the default, errors on your functions will be printed to the console. Otherwise will be sent to the client and thrown there.

### The client is a server and the server is a client

As you may have noticed the same Awaited.io code is used on the __server__ and the __client__ so you can register functions on the client side and call them from the server. The sky is the limit ;)

### Browser

A _browser version_ of the module compiled with the `last 2 versions` option [babel-preset-env](https://github.com/babel/babel-preset-env) is located under the `browser` directory of the project, and set to the `browser` option of the `package.json`, so if you are using webpack you are good to go.

### Current state

By now the module has been tested to work properly on _Node.js_ the browser test will be done as soon as I can.

Once the browser version has been tested I will publish the module on _NPM_.

If you find a bug please open an issue.

### Examples

By now there is only one example which is used as a test for all the module functions. It is well commented and I recomend you to read it if you want to know a little more how Awaited.io works.

Also the module code is less than 140 lines of code and is well commented too.

### License

```
Copyright 2017 Albert Calbet Martinez

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```