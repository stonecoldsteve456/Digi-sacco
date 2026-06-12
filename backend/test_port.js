const net = require('net');

const server = net.createServer();
server.listen(5000, '::', () => {
  console.log('Server listening on [::]:5000');
});

server.on('error', (err) => {
  console.error('Error:', err);
});