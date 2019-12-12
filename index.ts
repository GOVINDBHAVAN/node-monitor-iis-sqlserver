import * as child from 'child_process';
import { createEmail } from './routines/email';
import { config } from 'process';
import { env } from './config/config';

//const args = ['--inspect=9228', '--debug-brk'];
//this is working debugging in windows
const args = ['--inspect=9228'];
let reporter: child.ChildProcess = child.fork(__dirname + '/routines/index-reporter', [], { stdio: 'pipe', execArgv: args, env: process.env });
reporter.stdout.pipe(process.stdout)
process.on('exit', () => reporter.send('exit'));

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