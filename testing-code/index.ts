import * as child from 'child_process';
import { sleep } from '../util';

console.log('start');

let foo: child.ChildProcess = child.fork(__dirname + '/worker', [], { stdio: 'pipe' });
// foo.on('exit', process.exit(0));
foo.stdout.pipe(process.stdout)

foo.on('message', function (m) {
    // Receive results from child process
    console.log('received: ' + m);
});

// Send child process some work
foo.send('Please up-case this string');

(async () => {
    console.log('going to sleep in main');
    await sleep(2000);
    console.log('recovered from sleep in main');
    foo.send('exit');
})();

console.log('end');
