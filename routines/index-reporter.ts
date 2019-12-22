
// while (1 === 1) { }
import log from '../config/log';
import * as email from './email';
import { SystemReporter } from './system-reporter';
import * as pd from './db'
import { config } from 'process';
import { createEmail } from './email';
import { secondToDayHoursMinutes, printTrace, sleep, dateDiff, dateToString } from '../util';
import moment from 'moment';
import { OperatingSystemDetail } from './reporter';
import { nullLiteral } from 'babel-types';

//console.log('process.env', process.env);
// sleep(2000);
// process.exit(0);

pd.init();
const db = pd.db;
//pd.printAll();
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



let onAlertEmail: boolean = Boolean(process.env['ON_ALERT_EMAIL']);
let emailNotificationDurationMinutes: number = Number(process.env['EMAIL_NOTIFICATION_DURATION_MINUTES'] || 15);
let systemReporterCheckIntervalSeconds: number = Number(process.env['SYSTEM_REPORTER_CHECK_INTERVAL_SECONDS'] || 5);
let onWarningEmail: boolean = Boolean(process.env['ON_WARNING_EMAIL']);
let onDangerEmail: boolean = Boolean(process.env['ON_DANGER_EMAIL']);
const s = new SystemReporter({
    // to check system in this internal seconds
    intervalSeconds: systemReporterCheckIntervalSeconds,
    cpuAvgLoadTime: {
        // interval is avg seconds
        info: { interval: 1, threshold: 1 },
        warning: { interval: 5, threshold: 3 },
        danger: { interval: 10, threshold: 6 }
    },
    freeMemPercentage: {
        // if less then 41% then warning
        warning: { threshold: 91 },
        // if less then 20% then danger
        danger: { threshold: 20 }
    },
    ramUtilizationSummaryDurationMinutes: 1
}, db);
//process.exit(0);
// s.onMsg = (data: any) => log.info(`onMsg`, data);
// s.onAlert = (data: any) => log.info(`onAlert`, data);
// s.onWarning = (data: any) => log.info(`onWarning`, data);
// s.onDanger = (data: any) => log.info(`onDanger`, data);

//s.onMsg = (data: any) => log.info(`onMsg`, data);
s.onAlert = (data: any) => onAlert(data);
s.onWarning = (data: any) => onWarning(data);
s.onDanger = (data: any) => onDanger(data);


function onAlert(data: any) {
    // log.info(`onAlert`, data);
    // at member variable it is not getting value.
    if (!onAlertEmail) {
        return;
    }
    sendEmail(data, 'alert');
}
function onWarning(data: any) {
    // log.info(`onWarning`, data);
    //TODO unable to pass CONFIG/PROCESS ENV to child process
    if (!onWarningEmail) {
        return;
    }
    sendEmail(data, 'warning');
}
function onDanger(data: any) {
    // log.info(`onDanger`, data);
    if (!onDangerEmail) {
        return;
    }
    sendEmail(data, 'danger');
}

// let lastEmailSendDic = new Dictionary();    // { [id: string]: Date };
let lastEmailSendDic: { [key: string]: Date; } = {};

function sendEmail(data: any, type: string) {
    let lastEmailSend = new Date();
    let key = `${type}_last_email_send`;
    let exists = lastEmailSendDic[key] != undefined;
    if (exists) {
        lastEmailSend = lastEmailSendDic[key];
    }
    // console.log(`${lastEmailSend} and lastEmailSendDic`, lastEmailSendDic);

    let now = new Date();
    // console.log(`lastEmailSend: `, dateToString(lastEmailSend));

    let duration = dateDiff(lastEmailSend, now);
    // console.log(`${type} duration.minutes`, duration);

    if (exists && duration.minutes < emailNotificationDurationMinutes) {
        console.log(`last ${type} email sent ${duration.minutes} minutes ago, no need to send now`);
        return;
    }
    // console.log('data', data, type);

    // printTrace();
    let { sysInfo }: { sysInfo: OperatingSystemDetail } = data;
    let emailData = {
        uptime: null,
        ...data.data,
        cpu: {
            notification: 'a', result: 'r', threshold: 't'
        },
        mem: {
            notification: 'a', result: 'r', threshold: 't'
        },
        now: moment(data.now).format('DD-MMM-YYYY h:mm:ss a')
    };
    if (sysInfo) {
        emailData = {
            ...emailData,
            ...sysInfo,
            uptime: secondToDayHoursMinutes(sysInfo.uptimeSeconds)
        };
    }
    console.log('sending email', emailData);

    let email = createEmail();
    email.send({
        template: 'os-info',
        // otherwise error is coming
        message: {
            to: config['EMAIL_TO'],
        },
        locals: emailData
    })
        .then(() => {
            console.log(`${type} email sent on`, now);
            lastEmailSendDic[key] = now;
        })
        .catch(console.error);

}


// log.info('test', new Date(), 'a');

// var osu = require('node-os-utils')
// var cpu = osu.cpu

// cpu.usage()
//     .then(cpuPercentage => {
//         log.info(cpuPercentage)
//     })

