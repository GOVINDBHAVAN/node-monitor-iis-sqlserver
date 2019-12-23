import { BaseReporter, Config, AlertInput, NotificationEventType, InputUnit } from './reporter'
const { promises: fs } = require("fs");
import parser from 'fast-xml-parser';

export class IISReporter extends BaseReporter {

    // if uncomment then it create object of base config not this child config.
    config: IISReporterConfig;

    constructor(config: IISReporterConfig, db: PouchDB.Database) {
        super(config, db);
        this.db = db;
        this.config = config;
    }
    check(): void {
        this.checkIIS();
    }
    async checkIIS(): Promise<void> {
        let data = this.fetchIIS();
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
        //     const type = 'mem';
        //     //mem.free().then(fm => {
        //     let done = false;
        //     const { totalMemMb, freeMemMb } = fm;
        //     if (totalMemMb <= 0) { log.info('totalMemMb is zero'); return };
        //     const perc = Math.trunc(freeMemMb / totalMemMb * 100);
        //     if (!done && danger) { done = this.internalCheckAndFire(danger, type, NotificationEventType.DANGER, perc, true, { freeMemMb, totalMemMb }); }
        //     if (!done && warning) { done = this.internalCheckAndFire(warning, type, NotificationEventType.WARNING, perc, true, { freeMemMb, totalMemMb }); }
        //     if (!done && info) { done = this.internalCheckAndFire(info, type, NotificationEventType.ALERT, perc, true, { freeMemMb, totalMemMb }); }
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
    async fetchIIS() {
        try {
            //"/home/govind/Documents/projects/monitor/dist/routines"
            let xmlData = await fs.readFile(__dirname + '/../../prototypes/iisxml.xml', 'utf-8');
            var jsonObj = parser.parse(xmlData);
            console.log(jsonObj);
            return jsonObj;
        } catch (e) {
            console.log("e", e);
        }
    }
}

export interface IISReporterConfig extends Config {
    /** Optional to filter only selected app-pools not all, if blank then it will check all app-pools */
    appPoolsToCheck: string[];

    /** To monitor requests if exceeds this limit then alert/warning/danger notification will be generated */
    executionSeconds: AlertInput;
}
