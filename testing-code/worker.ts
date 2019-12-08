import { sleep } from '../util';

(async () => {
    console.log('before sleep');
    await sleep(5000);
    console.log('after sleep');
})();

process.on('message', function (m) {
    // Do work  (in this case just up-case the string
    m = m.toUpperCase();

    // Pass results back to parent process
    process.send(m.toUpperCase(m));

    if (m.toUpperCase() === 'EXIT') {
        process.exit(0);
    }
});