// while (1 === 1) { }

import log from './config/log';
import * as email from './routines/email';
import { SystemReporter } from './routines/system-reporter';
import * as pd from './routines/db'
pd.init();
const db = pd.db;
//pd.printAll();

log.info('start');
email.send();
log.info('exit');
//process.exit(0);

// const s = new SystemReporter({
//     intervalSeconds: 5,
//     cpuAvgLoadTime: {
//         info: { interval: 1, threshold: 1 },
//         warning: { interval: 5, threshold: 3 },
//         danger: { interval: 10, threshold: 6 }
//     },
//     freeMemPercentage: {
//         // if less then 41% then warning
//         warning: { threshold: 41 },
//         // if less then 20% then danger
//         danger: { threshold: 20 }
//     },
// }, db);
// s.onMsg = (data: any) => log.info(`onMsg`, data);
// s.onAlert = (data: any) => log.info(`onAlert`, data);
// s.onWarning = (data: any) => log.info(`onWarning`, data);
// s.onDanger = (data: any) => log.info(`onDanger`, data);
// log.info('test', new Date(), 'a');

// var osu = require('node-os-utils')
// var cpu = osu.cpu

// cpu.usage()
//     .then(cpuPercentage => {
//         log.info(cpuPercentage)
//     })
