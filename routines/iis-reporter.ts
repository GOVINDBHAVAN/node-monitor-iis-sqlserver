import { BaseReporter, Config, AlertInput, NotificationEventType, InputUnit } from './reporter'
const { promises: fs } = require("fs");
import xml2js from 'xml2js';
import _ from 'lodash';
import * as child from 'child_process';

export class IISReporter extends BaseReporter {

    // if uncomment then it create object of base config not this child config.
    config: IISReporterConfig;
    loadDataFromServer = false;

    constructor(config: IISReporterConfig, db: PouchDB.Database) {
        super(config, db);
        this.db = db;
        this.config = config;
    }
    loadLocalConfig() {
        this.loadDataFromServer = Boolean(process.env['IIS_DATA_FROM_SERVER'] || false);
        if (this.loadDataFromServer) {

        }
    }
    check(): void {
        this.checkIIS();
    }
    /** Returns true then to check other notification type:
     * True means current notificationEventType is executed and sent
     */
    async internalCheckIIS(notificationEventType: NotificationEventType, input?: InputUnit) {
        if (!input || !input.interval) return false;
        let eventTypeString = NotificationEventType[notificationEventType].toString().toLowerCase();
        let seconds = input.interval;
        if (!seconds || seconds <= 0) return false;
        let result = await this.fetchIIS(seconds);

        const type = 'iis';
        let rtn = false;
        for (let i = 0; i < result.length; i++) {
            const r = result[i];
            let s = Math.trunc(r.timeMS / 1000);
            if (s >= seconds) {
                this.internalCheckAndFire(input, type, notificationEventType, s, true, { r });
                rtn = true;
            }
        }
    }

    async checkIIS(): Promise<void> {
        let done = false;
        done = await this.internalCheckIIS(NotificationEventType.DANGER, this.config.executionSeconds.danger);
        if (!done) {
            done = await this.internalCheckIIS(NotificationEventType.WARNING, this.config.executionSeconds.warning);
        }
        if (!done) {
            done = await this.internalCheckIIS(NotificationEventType.ALERT, this.config.executionSeconds.info);
        }

        // /* { all in MB
        //     totalMemMb: 5859.13,
        //     usedMemMb: 3134.66,
        //     freeMemMb: 2724.47,
        //     freeMemPercentage: 46.5
        //    }
        //    mem.info()
        //        .then(info => {
        //            console.log(info)
        //        })
        // */
        // // { totalMemMb: 5859.13, freeMemMb: 2694.37 }
        // // mem.free().then(fm => console.log(`free memory`, fm));
        // //TODO: memory free check for 5 to 10 minutes not just current
        // let fm = await mem.free();
        // if (this.config.freeMemPercentage) {
        //     const { info, warning, danger } = this.config.freeMemPercentage;
        //     //});
        // }

        // if (this.config.ramUtilizationSummaryDurationMinutes) {
        //     const type = 'mem';
        //     let lastSyncTime: Date;
        //     let now = new Date();
        //     let dbValue: MemorySummary;
        //     try {
        //         //dbValue = await this.db.query(this.ms._id);
        //         dbValue = first(await this.db.find({
        //             selector: {
        //                 tag: this.ms.tag
        //             }
        //         }));
        //     } catch (err) {
        //         console.log(err);
        //         log.error(err);
        //     }
        //     if (dbValue && dbValue.time) {
        //         lastSyncTime = new Date(dbValue.time);
        //     }
        //     else {
        //         this.ms.time = now;
        //     }
        //     const durationDiff = dateDiff(lastSyncTime, now);
        //     // console.log('summary', { dbValue, lastSyncTime, durationDiff });
        //     // store 
        //     this.ms.totalMemMb = fm.totalMemMb;
        //     this.ms.lastFreeMemMb = fm.freeMemMb;
        //     this.ms.percentage = 100 - Math.trunc(fm.freeMemMb / fm.totalMemMb * 100);
        //     this.ms.avgTotalFreeMemMb += this.ms.percentage;
        //     this.ms.avgTotalDurationSeconds = (durationDiff.milliseconds || 0) / 1000;
        //     this.ms.count += 1;
        //     this.ms.calc();
        //     // console.log(this.ms);

        //     if (durationDiff.minutes >= this.config.ramUtilizationSummaryDurationMinutes) {
        //         let store = { ...this.ms };
        //         store.tag = 'avg_mem';
        //         //store._id = store.tag + ' as at ' + store.time.toString();
        //         store._id = guid();
        //         // store the overvall data for reporting
        //         upsert(store);
        //         //log.info(store.tag, this.ms);
        //         this.ms.reset();
        //     }
        //     await upsert(this.ms);
        // }
    }
    async fetchIIS(seconds: number) {
        try {
            //"/home/govind/Documents/projects/monitor/dist/routines"
            let json = await this.getJsonData(seconds);
            if (!json || !json.appcmd || !json.appcmd.REQUEST) return [];
            console.log(json);
            let requests = json.appcmd.REQUEST;

            let obj = _.map(requests, r => {
                let rtn = new IISRequestData();
                let d = r.$;
                rtn.appPoolName = d["APPPOOL.NAME"];
                rtn.clientIP = d["ClientIp"];
                rtn.timeMS = d["Time"];
                rtn.url = d["Url"];
                rtn.verb = d["Verb"];
                return rtn;
            });
            console.log(obj);
            return obj;
        } catch (e) {
            console.log("e", e);
        }
    }

    private async getJsonData(seconds: number) {
        if (this.loadDataFromServer) {
            return this.filterData(this.internalGetJsonDataFromServer(seconds));
        }
        else {
            return this.filterData(this.internalGetJsonDataFromFile(seconds));
        }
    }
    private async filterData(json: any) {
        if (!this.config.appPoolsToCheck || this.config.appPoolsToCheck.length <= 0) return json;
        var upperCaseNames = this.config.appPoolsToCheck.map(function (value) {
            return value.toUpperCase();
        });
        let filtered = _.filter(json, (r: IISRequestData) => (!r.url
            || !upperCaseNames.indexOf(r.url.toUpperCase())));
        return filtered;
    }
    private async internalGetJsonDataFromServer(seconds: number) {
        //let process = require('child_process');
        let ms = seconds * 1000;
        let command = `%windir%\system32\inetsrv\appcmd list requests /elapsed:${ms}`;
        let cmd: child.ChildProcess = child.spawn(command);

        cmd.stdout.on('data', function (output) {
            console.log(output.toString());
            return output;
        });

        cmd.on('close', function () {
            console.log('Finished');
        });

        //Error handling
        cmd.stderr.on('data', function (err) {
            console.log(err);
        });
    }
    private async internalGetJsonDataFromFile(seconds: number) {
        let xmlData = await fs.readFile(__dirname + '/../../prototypes/iisxml.xml', 'utf-8');
        //var jsonObj = parser.parse(xmlData);
        var parser = new xml2js.Parser( /* options */);
        let json = await parser.parseStringPromise(xmlData);
        return json;
    }
}

export class IISRequestData {
    url: string;
    clientIP: string;
    timeMS: number;
    appPoolName: string;
    verb: string;
}

export interface IISReporterConfig extends Config {
    /** Optional to filter only selected app-pools not all, if blank then it will check all app-pools */
    appPoolsToCheck: string[];

    /** To monitor requests if exceeds this limit then alert/warning/danger notification will be generated */
    executionSeconds: AlertInput;
}
