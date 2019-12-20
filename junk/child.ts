//child.js

//got a message
process.on('message', (message) => {
    console.log(message);
});

//send a message back to parent
process.send('A message from child.js');

setInterval(() => process.exit(0), 2000);