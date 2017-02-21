
// This awesome function comes from: https://gist.github.com/jed/982883
// Returns a random v4 UUID of the form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
function genUID(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,genUID)};

class AwaitedIO {

  constructor (socket, opts = {}) {
    // The socket.io instance
    this.socket = socket;
    // Context to be passed to all calls
    this.ctx = {};
    // The namespace for the calls
    this.namespace = 'awaited.io'
    // The actions chain to process incoming calls
    this.middleware = [];
    // The enqueued calls
    this.calls = [];
    // The local calls available
    this.local = []
    // The remote calls available
    this.remote = {};
    // Apply options
    for (let o of Object.keys(opts))
      if (opts.hasOwnProperty(o))
        this[o] = opts[o];
    // Register a listener for all the calls
    socket.on(`__${this.namespace}_call__`, (msg) => {
      this.chain(this.middleware, msg);
    });
    // Register a listener for all the returns
    socket.on(`__${this.namespace}_return__`, (msg) => {
      this.calls = this.calls.filter(call => {
        if (msg.id === call.id) {
          call.f(msg.response);
        }
      })
    });
    // Register a listener for all the errors
    socket.on(`__${this.namespace}_error__`, (msg) => {
      this.calls = this.calls.filter(call => {
        if (msg.id === call.id) {
          call.r(new Error(msg.response));
        }
      });
    });
    // Handle the internal call to update remote calls
    this.register('_update', () => {
      return this.local;
    });
  }

  // Registers a middleware function for the incoming calls
  use (fn) {
    this.middleware.push(fn);
    return this;
  }

  // Executes a middleware chain
  async chain (middleware, msg) {
    let index = 0;
    const next = async (err) => {
      if (index < this.middleware.length && !err) {
        index++;
        await this.middleware[index-1](next, this.ctx, msg);
      } else if (err) {
        this.socket.emit(`__${this.namespace}_error__`, err.message);
      }
    }
    return next();
  }
  
  // Constructs the middleware function to handle a call
  callback (name, handler) {
    return async (next, ctx, msg) => {
      if (msg.name === name) {
        let response = await handler(ctx, ...msg.args);
        let message = {
          id: msg.id,
          response
        };
        this.socket.emit(`__${this.namespace}_return__`, message);
      }      
      return await next();
    }
  }

  // Registers a call to be remotely available
  register (name, handler) {
    this.local.push(name);
    return this.use( this.callback(name, handler) );
  }

  // Makes a remote call
  call (name, ...args) {
    return new Promise((f, r)=> {
      let id = genUID();
      this.calls.push({ id, f, r });
      this.socket.emit(`__${this.namespace}_call__`, { id, name, args })
    });
  }

  // Updates the remote calls object
  async update () {
    // Get the remote calls names
    let remote = await this.call('_update');
    // Reset the remote object
    this.remote = {};
    // Fill the remote object with the calls wrappers
    remote.forEach(name => {
      this.remote[name] = async (...args) => {
        return await this.call(name, ...args);
      }
    });
    return this.remote;
  }

}

module.exports = AwaitedIO;