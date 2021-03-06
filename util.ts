import { env } from './config/config';
import { v4 as uuid } from 'uuid';
import inspector from 'inspector';
import * as child from 'child_process';
export const isdev: boolean = env == 'development';
const platform = require("os").platform();

/** Generate GUID v4 */
export function guid() {
    const id: string = uuid();
    return id;
}

export async function sleep(milliseconds: number): Promise<void> {
    let timer = await new Promise(res => setTimeout(res, milliseconds));
    return;
}

export function dateToString(dt) {
    let rtn = `${
        (dt.getMonth() + 1).toString().padStart(2, '0')}/${
        dt.getDate().toString().padStart(2, '0')}/${
        dt.getFullYear().toString().padStart(4, '0')} ${
        dt.getHours().toString().padStart(2, '0')}:${
        dt.getMinutes().toString().padStart(2, '0')}:${
        dt.getSeconds().toString().padStart(2, '0')}`
    return rtn;
}

export function dateDiff(start, end) {
    // let milliseconds = (end - start); // milliseconds between end and start
    // let days = Math.floor(milliseconds / 86400000); // days
    // let hours = Math.floor((milliseconds % 86400000) / 3600000); // hours
    // let minutes = Math.round(((milliseconds % 86400000) % 3600000) / 60000); // minutes
    // wrong minutes
    // return { days, hours, minutes, seconds: Math.floor(milliseconds / 1000), milliseconds };
    let milliseconds = start > end ? start % end : end % start;
    let seconds = Math.floor(milliseconds / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    let days = Math.floor(hours / 24);
    let weeks = Math.floor(days / 7);
    return { days, hours, minutes, seconds, milliseconds, weeks };
}

/** Convert seconds to print as string like 1 days, 2h, 37m and 12s */
export function secondsToString(seconds) { // day, h, m and s
    var days = Math.floor(seconds / (24 * 60 * 60));
    seconds -= days * (24 * 60 * 60);
    var hours = Math.floor(seconds / (60 * 60));
    seconds -= hours * (60 * 60);
    var minutes = Math.floor(seconds / (60));
    seconds -= minutes * (60);
    return ((0 < days) ? (days + " day, ") : "") + hours + "h, " + minutes + "m and " + seconds + "s";
}
export function secondToDayHoursMinutes(seconds) {
    //var seconds = parseInt(123456, 10);

    let days = Math.floor(seconds / (3600 * 24));
    seconds -= days * 3600 * 24;
    let hours = Math.floor(seconds / 3600);
    seconds -= hours * 3600;
    let minutes = Math.floor(seconds / 60);
    seconds -= minutes * 60;
    // console.log(days + " days, " + hrs + " Hrs, " + mnts + " Minutes, " + seconds + " Seconds");
    return { days, hours, minutes, seconds };
}

export function printTrace() {
    console.log(new Error().stack);
}

// export let debug = typeof v8debug === 'object' || /--debug|--inspect/.test(process.execArgv.join(' '));
export function debuggerAttached() {
    return (inspector.url() !== undefined);
}

export function forkChild(relativePath: string, setPipe: boolean = true) {
    //const args = ['--inspect=9228', '--debug-brk'];
    //const args = ['--debug-brk'];
    //this is working debugging in windows
    //const args = ['--inspect-brk=9229'];
    let args = [];
    if (debuggerAttached()) {
        // it will give Child process exited with code 9 error
        //args = ['--debug-brk'];
        // working on child debug on windows
        args = ['--inspect-brk=9999'];
        // not running
        // args = ['--inspect-brk=0'];
        // it will give Child process exited with code 12 error
        //args = ['--inspect-brk=nnnn'];
        //const args = ['--inspect'];
        //args = ['--harmony'];
        //args = ['--debug-brk'];
    }
    let p: child.ChildProcess = child.fork(__dirname + relativePath
        , [], { stdio: 'pipe', execArgv: args, env: process.env });
    if (setPipe) {
        p.stdout.pipe(process.stdout)
        process.stdin.pipe(p.stdin);
    }
    return p;
}

export function toBoolean(value) {
    if (!value) return false;
    switch (value) {
        case true:
        case "true":
        case 1:
        case "1":
        case "on":
        case "yes":
            return true;
        default:
            return false;
    }
}

export async function isAdmin() {
    if (platform == "win32" || platform == "win64") {
        require('child_process').exec('net session', function (err, stdout, stderr) {
            if (err || !(stdout.indexOf("There are no entries in the list.") > -1)) {
                //console.log("You are not running this application as administrator");
                return false;
            } else {
                //console.log("This is being ran with administrator privileges!");
                return true;
            }
        });
    } else {
        //console.log("Unknown");
        // https://h3manth.com/new/blog/2014/check-for-root-user/
        let isRoot = process.getuid && process.getuid() === 0;
        return isRoot;
    }
}