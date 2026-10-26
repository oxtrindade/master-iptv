/* Serviço webOS: sobe o proxy local e informa porta/token ao app via Luna bus. */
var Service = require('webos-service');
var proxy = require('./proxy');

var PORT = 18080;
var service = new Service('com.rodrigo.iptv.service');
var server = null;
var token = Math.random().toString(36).slice(2) + Date.now().toString(36);

// mantém o serviço vivo enquanto o app estiver aberto
try {
  service.activityManager.create('keepAlive', function () {});
} catch (e) { /* versões antigas não têm activityManager */ }

service.register('start', function (message) {
  if (server) {
    return message.respond({ returnValue: true, port: PORT, token: token });
  }
  server = proxy.create(token);
  server.on('error', function (err) {
    server = null;
    message.respond({ returnValue: false, errorText: String(err && err.message) });
  });
  server.listen(PORT, '127.0.0.1', function () {
    message.respond({ returnValue: true, port: PORT, token: token });
  });
});

service.register('stop', function (message) {
  if (server) { try { server.close(); } catch (e) {} server = null; }
  message.respond({ returnValue: true });
});
