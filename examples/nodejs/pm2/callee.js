// callee.js
import net from 'net';
import pm2 from 'pm2';
import {
  Callee
} from '../../../lib/index.js';
import EventEmitter from 'events';

const messageType = 'event-invoke';
const messageTopic = 'some topic';

class CalleeChannel extends EventEmitter {
  constructor() {
    super();
    this.connect();
  }

  onProcessMessage(packet) {
    if (packet.type !== messageType) {
      return;
    }
    this.emit('message', packet.data);
  }

  send(data) {
    pm2.list((err, processes) => {
      if (err) { throw err; }
      const list = processes.filter(p => p.name === 'invoker');
      const pmId = list[0].pm2_env.pm_id;
      pm2.sendDataToProcessId({
        id: pmId,
        type: messageType,
        topic: messageTopic,
        data,
      }, function (err, res) {
        if (err) { throw err; }
      });
    });
  }

  connect() {
    process.on('message', this.onProcessMessage.bind(this));
  }

  disconnect() {
    process.off('message', this.onProcessMessage.bind(this));
  }
}

const channel = new CalleeChannel();
channel.connect();

const callee = new Callee(channel);

// async method
callee.register(async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
});

// sync method
callee.register(function max(...args) {
  return Math.max(...args);
});

callee.listen();

// keep your process alive
net.createServer().listen();
