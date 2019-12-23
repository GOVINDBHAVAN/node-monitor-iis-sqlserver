//const why = require('why-is-node-running') // should be your first require
// import { createEmail } from './routines/email';
// import { config } from 'process';
// import cfg from './config/config';
import { forkChild, sleep } from './util';

// var pattern = /\d+\.?\d*|\.\d+/;
// var match = pattern.exec("the number is 7.5!");

// var start = match.index;
// var text = match[0];
// var end = start + text.length;

// function checkPending() {
//     let x = 5;  // 5 Seconds

//     // Do your thing here
//     why();

//     setTimeout(checkPending, x * 1000);
// }
//console.log('main cfg', cfg);

//const args = ['--inspect=9228', '--debug-brk'];
//const args = ['--debug-brk'];
//this is working debugging in windows
//const args = ['--inspect-brk=9229'];
// const args = [];
//let reporter: child.ChildProcess = child.fork(__dirname + '/routines/index-reporter', [], { stdio: 'pipe', execArgv: args, env: process.env });
//let reporter: child.ChildProcess = child.fork(__dirname + '/routines/index-reporter', [], { stdio: 'pipe' });
let reporter = forkChild('/routines/index-reporter');
//let reporter = forkChild('/routines/dummy', false);
//no need of this
//reporter.send('start');
//sleep(1000);
//process.on('exit', () => reporter.send('exit'));

reporter.on('exit', (code) => {
    console.log(`Child process exited with code ${code}`);
});

process.on('beforeExit', function () {
    setTimeout(function () { //run async code
        console.log('beforeExit')
        process.exit(0);  //exit manually
    }, 1000);
});

//checkPending();

// let email = createEmail();
// email.send({
//     template: 'mars',
//     // otherwise error is coming
//     message: {
//         to: config['EMAIL_TO'],
//     },
//     locals: {
//         name: 'Govind'
//     }
// })
//     .then(console.log)
//     .catch(console.error);