'use strict';

import winston = require('winston');
const { createLogger, format, transports } = require('winston');
const appRoot = require('app-root-path');
const path = require('path');
import winstonDailyRotateFile = require('winston-daily-rotate-file');
const { isObject } = require('lodash');
const { SPLAT } = require('triple-beam');

function formatObject(param) {
    if (isObject(param)) {
        return JSON.stringify(param);
    }
    return param;
}

// Ignore log messages if they have { private: true }
const all = format((info) => {
    const splat = info[SPLAT] || [];
    const message = formatObject(info.message);
    const rest = splat.map(formatObject).join(' ');
    info.message = `${message} ${rest}`;
    return info;
});


const logFormat = winston.format.combine(
    all(),
    winston.format.label({ label: path.basename(process.mainModule.filename) }),
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.align(),
    winston.format.printf(
        info => `${info.timestamp} ${info.level} [${info.label}]: ${formatObject(info.message)}`
    )
);

winston.loggers.add('customLogger', {
    format: logFormat,
    transports: [
        new winstonDailyRotateFile({
            filename: './logs/%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            level: 'info',
        }),
        new winston.transports.Console({
            level: 'info',
        })
    ],
    exitOnError: false, // do not exit on handled exceptions
});

// const options = {
//     file: {
//         level: 'info',
//         filename: `${appRoot}/logs/app.log`,
//         handleExceptions: true,
//         json: true,
//         maxsize: 5242880, // 5MB
//         maxFiles: 5,
//         colorize: false,
//     },
//     console: {
//         level: 'debug',
//         handleExceptions: true,
//         json: false,
//         colorize: true,
//     },
// };

// winston.loggers.add('newlogger', {
//     transports: [
//         new winston.transports.File(options.file),
//         new winston.transports.Console(options.console)
//     ],
//     exitOnError: false, // do not exit on handled exceptions
// });

const log = winston.loggers.get('customLogger');
export default log;
