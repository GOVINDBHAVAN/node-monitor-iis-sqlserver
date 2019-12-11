// while (1 === 1) { }

import log from '../config/log';
import * as email from './email';
import { SystemReporter } from './system-reporter';
import * as pd from './db'
import { config } from 'process';
import { createEmail } from './email';
pd.init();
const db = pd.db;
// pd.printAll();
// db.find({
//     selector: {
//         tag: 'avg_mem'
//     }
// }).then(function (result) {
//     console.log(result.docs.length);
//     console.log(result);
// }).catch(function (err) {
//     console.log(err);
// });


process.on('message', function (m) {
    if (m.toString().toLowerCase() === 'exit') {
        process.exit(0);
    }
});

// log.info('start');
// email.send();
// log.info('exit');
//process.exit(0);

let onAlertEmail: boolean = config['ON_ALERT_EMAIL'] || false;
let onWarningEmail: boolean = config['ON_WARNING_EMAIL'] || false;
let onDangerEmail: boolean = config['ON_DANGER_EMAIL'] || false;

const s = new SystemReporter({
    // to check system in this internal seconds
    intervalSeconds: 5,
    cpuAvgLoadTime: {
        // interval is avg seconds
        info: { interval: 1, threshold: 1 },
        warning: { interval: 5, threshold: 3 },
        danger: { interval: 10, threshold: 6 }
    },
    freeMemPercentage: {
        // if less then 41% then warning
        warning: { threshold: 41 },
        // if less then 20% then danger
        danger: { threshold: 20 }
    },
    ramUtilizationSummaryDurationMinutes: 1
}, db);
// s.onMsg = (data: any) => log.info(`onMsg`, data);
// s.onAlert = (data: any) => log.info(`onAlert`, data);
// s.onWarning = (data: any) => log.info(`onWarning`, data);
// s.onDanger = (data: any) => log.info(`onDanger`, data);

s.onMsg = (data: any) => log.info(`onMsg`, data);
s.onAlert = (data: any) => onAlert(data);
s.onWarning = (data: any) => onWarning(data);
s.onDanger = (data: any) => onDanger(data);

function onAlert(data: any) {
    log.info(`onAlert`, data);
    if (onAlertEmail) {
        let emailData = {
            hostname: ''
        };
        sendEmail(emailData);
    }
}
function onWarning(data: any) {
    log.info(`onWarning`, data);
}
function onDanger(data: any) {
    log.info(`onDanger`, data);

}

function sendEmail(data) {
    let email = createEmail();
    email.send({
        template: 'os-info',
        // otherwise error is coming
        message: {
            to: config['EMAIL_TO'],
        },
        locals: {
            name: 'Govind'
        }
    })
        .then(console.log)
        .catch(console.error);
}


// log.info('test', new Date(), 'a');

// var osu = require('node-os-utils')
// var cpu = osu.cpu

// cpu.usage()
//     .then(cpuPercentage => {
//         log.info(cpuPercentage)
//     })

