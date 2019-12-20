const cp = require('child_process');
let child = cp.fork(__dirname + '/child.js');

child.on('message', (message) => {
    console.log('Parent got message: ' + message);
    //this script got a message from child.js
});

child.send('Parent sent a message to child.js');
//send a message to child.js