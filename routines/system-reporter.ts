import { BaseReporter, Config, AlertInput, NotificationType, NotificationEventType, InputUnit } from './reporter'
import { cpu, drive, mem } from 'node-os-utils';
import log from '../config/log';
import { info } from 'winston';
import { dateDiff } from '../util';
import { upsert } from './db';

export class SystemReporter extends BaseReporter {

    // if uncomment then it create object of base config not this child config.
    config: SystemReporterConfig;
    db: PouchDB.Database;
    ms: MemorySummary;
    constructor(config: SystemReporterConfig, db: PouchDB.Database) {
        super(config);
        this.db = db;
        this.config = config;
        this.ms = new MemorySummary();
    }
    check(): void {
        this.checkCpu();
        this.checkDisk();
        this.checkMem();
    }
    async checkMem(): Promise<void> {
        /* { all in MB
            totalMemMb: 5859.13,
            usedMemMb: 3134.66,
            freeMemMb: 2724.47,
            freeMemPercentage: 46.5
           }
           mem.info()
               .then(info => {
                   console.log(info)
               })
        */
        // { totalMemMb: 5859.13, freeMemMb: 2694.37 }
        // mem.free().then(fm => console.log(`free memory`, fm));
        //TODO: memory free check for 5 to 10 minutes not just current
        let fm = await mem.free();
        if (this.config.freeMemPercentage) {
            const { info, warning, danger } = this.config.freeMemPercentage;
            const type = 'mem';
            //mem.free().then(fm => {
            let done = false;
            const { totalMemMb, freeMemMb } = fm;
            if (totalMemMb <= 0) { log.info('totalMemMb is zero'); return };
            const perc = Math.trunc(freeMemMb / totalMemMb * 100);
            if (!done && danger) { done = this.internalCheckAndFire(danger, type, NotificationEventType.DANGER, perc, true, { freeMemMb, totalMemMb }); }
            if (!done && warning) { done = this.internalCheckAndFire(warning, type, NotificationEventType.WARNING, perc, true, { freeMemMb, totalMemMb }); }
            if (!done && info) { done = this.internalCheckAndFire(info, type, NotificationEventType.ALERT, perc, true, { freeMemMb, totalMemMb }); }
            //});
        }

        if (this.config.ramUtilizationSummaryDurationMinutes) {
            const type = 'mem';
            let lastSyncTime: Date;
            let now = new Date();
            let dbValue = null;
            try {
                //dbValue = await this.db.query(this.ms._id);
                dbValue = await this.db.find({
                    selector: {
                        tag: this.ms.tag
                    }
                });
            } catch { }
            console.log('dbvalue', dbValue);

            if (dbValue) {
                lastSyncTime = new Date(dbValue.toString());
            }
            else {
                this.ms.time = now;
            }
            const durationDiff = dateDiff(lastSyncTime, now);
            console.log('summary', { dbValue, lastSyncTime, durationDiff });
            // store 
            if (durationDiff.minutes >= this.config.ramUtilizationSummaryDurationMinutes) {
                console.log('total summary', this.ms);
                this.ms.reset();
            }
            this.ms.overallTotal += fm.freeMemMb;
            this.ms.count += 1;
            console.log(this.ms);
            await upsert(this.ms, dbValue === null);
        }
    }
    checkDisk(): void {
        // drive.
        //     drive.info()
        //     .then(info => {
        //         console.log(info)
        //     })
    }
    checkCpu(): void {
        if (this.config.cpuAvgLoadTime) {
            // use "top" command to cross check the result
            // execute this command to create fake load: "stress --cpu 3"  (linux)
            // in windows use consume.exe
            const { info, warning, danger } = this.config.cpuAvgLoadTime;
            const type = 'cpu';
            let done = false;
            if (!done && danger) { done = this.internalCheckAndFire(danger, type, NotificationEventType.DANGER, cpu.loadavgTime(danger.interval)); }
            if (!done && warning) { done = this.internalCheckAndFire(warning, type, NotificationEventType.WARNING, cpu.loadavgTime(warning.interval)); }
            if (!done && info) { done = this.internalCheckAndFire(info, type, NotificationEventType.ALERT, cpu.loadavgTime(info.interval)); }
        }
    }

    private saveInDB(data: any) {
        const doc = {
            //_id: new Date().toISOString(), ...data
            //it won't be unique date, TODO
            time: new Date(), ...data
        };
        // console.log('save', doc);
        this.db.post(doc).then().catch((err) => {
            log.error(err);
            console.error(err);
        });
    }
    private internalCheckAndFire(input: InputUnit, type: string, eventType: NotificationEventType, result?: number
        , reverse?: boolean
        , furtherDetail?: {} | {}): boolean {
        // log.info(`${type} ${NotificationEventType[eventType]} : ${result}`);
        let eventTypeString = NotificationEventType[eventType].toString().toLowerCase();
        if (result) {
            this.saveInDB({
                notification: 'log'
                , type
                , input
                , result
                , eventTypeString
                , furtherDetail
            });
        }
        if (result
            && input.threshold
            && (!reverse ? (result >= input.threshold) : (result < input.threshold))
        ) {
            const data = { notification: 'alert', type, result, threshold: input.threshold, eventTypeString, furtherDetail };
            this.saveInDB(data);
            this.checkAndRaiseEvent({ type, eventType, data });
            return true;
        }
        return false;
    }
}
/** To calculate RAM summary over the period of time */
export class MemorySummary {
    get _id(): string {
        return this.tag;
    }
    tag: string = 'mem_last_sync';
    time: Date;
    /** Accumulated value of total free RAM from last reset */
    overallTotal: number = 0;
    /** count of interval of accumulation */
    count: number = 0;
    /** Calculate summary as per current data */
    get summary(): number {
        let ramSummary = 0;
        if (this.overallTotal && this.count) {
            ramSummary = this.overallTotal / this.count * 100;
        }
        return ramSummary;
    }
    reset(): void {
        this.time = new Date();
        this.overallTotal = 0;
        this.count = 0;
    }
}

export interface SystemReporterConfig extends Config {
    //avgLoadTime?: number[];
    /**
         Load average – is the average system load calculated over a given period of time of 1, 5 and 15 minutes.
        A load average of 1.0 on a single processor roughly corresponds to a CPU utilization of 100%.
        The numbers are read from left to right, and the output above means that:
        1.98, 2.15, 2.21
        load average over the last 1 minute is 1.98
        load average over the last 5 minutes is 2.15
        load average over the last 15 minutes is 2.21
     */
    cpuAvgLoadTime?: AlertInput;
    /**
        Check current free memory percentage.
        interval is ignored here.
     */
    freeMemPercentage?: AlertInput;
    /**
     * To create summary of RAM utilization over the period of given minutes like 15 to 10 minutes
     */
    ramUtilizationSummaryDurationMinutes?: number;
}

//#region testing codes 
/*
        cpu.usage()
            .then(cpuPercentage => {
                this.emit('data', cpuPercentage);
            })

        // const osCmd = osu.oscmd

        // osCmd.whoami()
        //     .then(userName => {
        //         console.log(userName) // admin
        //     })
        if (this.config.avgLoadTime) {
            this.config.avgLoadTime.forEach(c => {
                log.info(`Avg ${c} min load ${cpu.loadavgTime(c)}`);
                // log.info(`Avg 5 min load ${cpu.loadavgTime(5)} `);
                //log.info(`cpu.loadavg() ${cpu.loadavg()} `);      returns 4.6357421875,4.7783203125,4.67578125
            });
        }
*/
//#endregion