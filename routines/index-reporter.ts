
// while (1 === 1) { }
import log from '../config/log';
import * as email from './email';
import { SystemReporter } from './system-reporter';
import * as pd from './db'
import { config } from 'process';
import { createEmail } from './email';
import { secondToDayHoursMinutes, printTrace, sleep, dateDiff, dateToString, toBoolean, isAdmin, secondsToString } from '../util';
import moment from 'moment';
import { OperatingSystemDetail } from './reporter';
import { IISReporter } from './iis-reporter';
import _ from 'lodash';
import { Lock } from './lock';

if (!isAdmin()) {
    console.log('Not running as administrator or root user.');
    process.exit(0);
}

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


let onAlertEmail = toBoolean(process.env['ON_ALERT_EMAIL']);
let chkDISK = toBoolean(process.env['CHECK_DISK']);
let chkCPU = toBoolean(process.env['CHECK_CPU']);
let chkMEM = toBoolean(process.env['CHECK_MEM']);
let chkIIS = toBoolean(process.env['CHECK_IIS']);
let chkSQL = toBoolean(process.env['CHECK_SQL']);
let emailNotificationDurationMinutes: number = Number(process.env['EMAIL_NOTIFICATION_DURATION_MINUTES'] || 15);
let systemReporterCheckIntervalSeconds: number = Number(process.env['SYSTEM_REPORTER_CHECK_INTERVAL_SECONDS'] || 5);
let onWarningEmail: boolean = toBoolean(process.env['ON_WARNING_EMAIL']);
let onDangerEmail: boolean = toBoolean(process.env['ON_DANGER_EMAIL']);
const iisReporter = new IISReporter({
    intervalSeconds: systemReporterCheckIntervalSeconds,
    enable: chkIIS,
    executionSeconds: {
        // if requests execution exceeds 10 seconds then alert
        info: { threshold: 10 },
        // if requests execution exceeds 30 seconds then alert
        warning: { threshold: 30 },
        // if requests execution exceeds 120 seconds then alert
        danger: { threshold: 120 }
    }, appPoolsToCheck: ['/ozell/api/attendance/process', '/drbhattlab/api/attendance/process']
}, db);
iisReporter.onAlert = (data: any) => onAlert(data);
iisReporter.onWarning = (data: any) => onWarning(data);
iisReporter.onDanger = (data: any) => onDanger(data);

const sysReporter = new SystemReporter({
    // to check system in this internal seconds
    intervalSeconds: systemReporterCheckIntervalSeconds,
    enable: chkMEM || chkCPU,
    cpuAvgLoadTime: {
        // last 1 min load time to check for info
        info: { interval: 1, threshold: 1 },
        // last 5 min load time to check for warning
        warning: { interval: 5, threshold: 3 },
        // last 15 min load time to check for danger
        danger: { interval: 15, threshold: 6 }
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
sysReporter.onAlert = (data: any) => onAlert(data);
sysReporter.onWarning = (data: any) => onWarning(data);
sysReporter.onDanger = (data: any) => onDanger(data);


function onAlert(data: any) {
    // log.info(`onAlert`, data);
    // at member variable it is not getting value.
    sendEmail(data);
}
function onWarning(data: any) {
    // log.info(`onWarning`, data);
    //TODO unable to pass CONFIG/PROCESS ENV to child process
    if (!onWarningEmail) {
        return;
    }
    sendEmail(data);
}
function onDanger(data: any) {
    // log.info(`onDanger`, data);
    if (!onDangerEmail) {
        return;
    }
    sendEmail(data);
}

// let lastEmailSendDic = new Dictionary();    // { [id: string]: Date };
let lastEmailSendDic: { [key: string]: Date; } = {};
// nested dictionary
let emailDataForTag: { [key: string]: { [key: string]: any; }; } = {};

function getTagForKey(type: string) {
    // switch (type.toLocaleLowerCase()) {
    //     case "mem": case "cpu": case "disk": {
    //         return "Operating System";
    //     }
    // }
    //return type;
    // send single email for all types of RAM,CPU,IIS,SQL
    return "EMAIL_ALERT";
}

function getEmailData(tagForKey: string, type: string) {
    let data = emailDataForTag[tagForKey];
    if (!data) return null;
    let typeData = data[type];
    if (!typeData) return null;
    return typeData;
}

function addEmailData(tagForKey: string, type: string, data: any) {
    if (!emailDataForTag[tagForKey]) {
        emailDataForTag[tagForKey] = {};
    }
    emailDataForTag[tagForKey][type] = data;
}

/** check if given types (danger, warning, alert) is available in from data array */
function isAvailable(types: string[], sample: any[]): { available: boolean, type: string } {
    let result = { available: false, type: null };
    for (let i = 0; i < types.length; i++) {
        let type = types[i];
        _.forEach(sample, (d: any) => {
            if (d && d.data && d.data.eventTypeString === type) {
                result = { available: true, type: type };
                return;
            }
        });
        if (result) {
            return result;
        }
    }
    return result;
}
function sendEmail(data: any) {
    let type: string = data.data.type;
    let tagForKey = getTagForKey(type);
    let lastEmailSend = new Date();
    let key = `${tagForKey}_last_email_send`;
    let exists = lastEmailSendDic[key] != undefined;
    if (exists) {
        lastEmailSend = lastEmailSendDic[key];
    }
    // console.log(`${lastEmailSend} and lastEmailSendDic`, lastEmailSendDic);

    let now = new Date();
    // console.log(`lastEmailSend: `, dateToString(lastEmailSend));

    let duration = dateDiff(lastEmailSend, now);
    // console.log(`${type} duration.minutes`, duration);

    // add data in queue for sending single email
    addEmailData(tagForKey, type, data);

    if (!data.isAlert) {
        return;
    }
    switch (data.data.eventTypeString) {
        case 'alert':
            {
                if (!onAlertEmail) return;
                break;
            }
        case 'warning':
            {
                if (!onWarningEmail) return;
                break;
            }
        case 'danger':
            {
                if (!onDangerEmail) return;
                break;
            }
    }

    if (exists && duration.minutes < emailNotificationDurationMinutes) {
        console.log(`last ${type} email sent ${duration.minutes} minutes ago, no need to send now`);
        return;
    }
    // console.log('data', data, type);

    // printTrace();
    console.log('tagForKey', tagForKey);

    // it is sending duplicate email
    const lock = new Lock();

    let dataForEmail = {};
    /*
        if (tagForKey.toLocaleLowerCase() === 'operating system') {
            let cpu = getEmailData(tagForKey, 'cpu');
            let mem = getEmailData(tagForKey, 'mem');
            let disk = getEmailData(tagForKey, 'disk');
            if (!cpu || !mem) {
                // wait for the cpu and mem data, then send single email.
                return;
            }
            let subjectType = '';
            if (cpu.data.eventTypeString == 'danger' || mem.data.eventTypeString == 'danger') {
                subjectType = 'danger';
            }
            else if (cpu.data.eventTypeString == 'warning' || mem.data.eventTypeString == 'warning') {
                subjectType = 'warning';
            }
            else {
                subjectType = 'alert';
            }
            dataForEmail = { subjectType, cpu: cpu.data, mem: mem.data, disk: (disk ? disk.data : null) };
            console.log('dataForEmail', dataForEmail);
    
        }
    */
    let sql = getEmailData(tagForKey, 'sql');
    let iis = getEmailData(tagForKey, 'iis');
    let cpu = getEmailData(tagForKey, 'cpu');
    let mem = getEmailData(tagForKey, 'mem');
    let disk = getEmailData(tagForKey, 'disk');
    if ((chkSQL && !sql)
        || (chkIIS && !iis)
        || (chkCPU && !cpu)
        || (chkMEM && !mem)
        || (chkDISK && !disk)) {
        // wait for all data available, then send single email.
        lock.release();
        return;
    }

    let sample = [];
    if (chkSQL) sample.push(sql);
    if (chkIIS) sample.push(iis);
    if (chkCPU) sample.push(cpu);
    if (chkMEM) sample.push(mem);
    if (chkDISK) sample.push(disk);
    let subjectType = isAvailable(['danger', 'warning', 'alert'], sample);
    if (!subjectType || !subjectType.available) {
        lock.release();
        log.error(`Error occured subject type not available`, sample);
        throw `Error occured subject type not available`;
    }
    if (iis && iis.data) {
        // let requests = [{ "url": 'a', "time": "t", "alertType": "a" }
        //     , { "url": 'b', "time": "t2", "alertType": "ab" }];
        let requests = _.orderBy(_.concat(iis.data.furtherDetail.danger, iis.data.furtherDetail.warning, iis.data.furtherDetail.info)
            , r => {
                r.timeSeconds
            }, "desc");
        let maxRequest = _.find(requests, r => {
            if (r.timeSeconds === iis.data.result) return r;
        });
        iis.data = {
            ...iis.data,
            secondsToString: secondsToString(iis.data.result),
            maxRequest,
            requests
        }
    }
    dataForEmail = {
        subjectType: subjectType.type
        , sql: (sql ? sql.data : null)
        , iis: (iis ? iis.data : null)
        , cpu: (cpu ? cpu.data : null)
        , mem: (mem ? mem.data : null)
        , disk: (disk ? disk.data : null)
    };

    console.log('dataForEmail', dataForEmail);

    let { sysInfo }: { sysInfo: OperatingSystemDetail } = data;
    let emailData = {
        uptime: null,
        ...data.data,
        ...dataForEmail,
        // cpu: {
        //     notification: 'a', result: 'r', threshold: 't'
        // },
        // mem: {
        //     notification: 'a', result: 'r', threshold: 't'
        // },
        now: moment(data.now).format('DD-MMM-YYYY h:mm:ss a')
    };
    if (sysInfo) {
        emailData = {
            ...emailData,
            os: sysInfo,
            uptime: secondsToString(sysInfo.uptimeSeconds)
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
            emailDataForTag[tagForKey] = null; //clear old last data of different types (cpu,ram) as these are sent now.
            lock.release();
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

