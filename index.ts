import { createEmail } from './routines/email';
import { config } from 'process';
import cfg from './config/config';
import { forkChild, sleep } from './util';

//console.log('main cfg', cfg);

//const args = ['--inspect=9228', '--debug-brk'];
//const args = ['--debug-brk'];
//this is working debugging in windows
//const args = ['--inspect-brk=9229'];
// const args = [];
//let reporter: child.ChildProcess = child.fork(__dirname + '/routines/index-reporter', [], { stdio: 'pipe', execArgv: args, env: process.env });
//let reporter: child.ChildProcess = child.fork(__dirname + '/routines/index-reporter', [], { stdio: 'pipe' });
//let reporter = forkChild('/routines/index-reporter');
// let another = forkChild('/routines/dummy');
// let another2 = forkChild('/routines/dummy');
//no need of this
//reporter.send('start');
//sleep(1000);
//process.on('exit', () => reporter.send('exit'));

// reporter.on('exit', (code) => {
//     console.log(`Child process exited with code ${code}`);
// });

// process.on('beforeExit', function () {
//     setTimeout(function () { //run async code
//         console.log('beforeExit')
//         process.exit(0);  //exit manually
//     }, 1000);
// });

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