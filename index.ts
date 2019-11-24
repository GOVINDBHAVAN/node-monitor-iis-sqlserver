// while (1 === 1) { }
import log from './config/log';
import { SystemReporter } from './routines/system-reporter';
const s = new SystemReporter({ intervalSeconds: 1 });
s.onMsg = (data: any) => log.info(data);
// log.info('test', new Date(), 'a');

// var osu = require('node-os-utils')
// var cpu = osu.cpu

// cpu.usage()
//     .then(cpuPercentage => {
//         log.info(cpuPercentage)
//     })
