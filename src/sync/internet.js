// src/sync/internet.js
const dns = require("dns");
const EventEmitter = require("events");

class InternetMonitor extends EventEmitter {
  constructor() {
    super();
    this.online = false;
    this.start();
  }

  checkInternet() {
    dns.lookup("google.com", err => {
      const newStatus = !err;

      if (newStatus !== this.online) {
        this.online = newStatus;
        this.emit(newStatus ? "online" : "offline");
      }
    });
  }

  start() {
    this.checkInternet();
    setInterval(() => this.checkInternet(), 8000); // cada 8s
  }
}

module.exports = new InternetMonitor();
