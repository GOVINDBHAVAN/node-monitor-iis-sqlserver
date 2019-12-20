import { sleep } from '../util';
//console.log('running on port:', process.execArgv.join(' '));
async function init() {
    console.log('dummy before sleep', new Date());
    await sleep(5000);
    console.log('dummy after sleep', new Date());
    process.exit();
}
init();
// setInterval(() => process.exit(0), 2000);
