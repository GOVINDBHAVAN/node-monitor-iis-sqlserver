import { BaseReporter, Config, AlertInput, NotificationType, NotificationEventType, InputUnit } from './reporter'
import { cpu, drive, mem, oscmd, os } from 'node-os-utils';
import log from '../config/log';
import { info } from 'winston';
import { dateDiff, guid } from '../util';
import to from './to';
import { upsert, first } from './db';

export class SystemReporter extends BaseReporter {

    // if uncomment then it create object of base config not this child config.
    config: SystemReporterConfig;
    db: PouchDB.Database;
    ms: MemorySummary;
    sysInfo: OperatingSystemDetail;
    constructor(config: SystemReporterConfig, db: PouchDB.Database) {
        super(config);
        this.db = db;
        this.config = config;
        this.ms = new MemorySummary();
        this.syncCheckOSDetails();
    }
    check(): void {
        this.checkCpu();
        this.checkDisk();
        this.checkMem();
    }
    systemInformation(): string {
        let rtn = JSON.stringify(this.sysInfo);
        return rtn;
    }
    /** Sync function to fetch OS details */
    syncCheckOSDetails() {
        this.sysInfo = new OperatingSystemDetail();
        try {
            if (oscmd) {
                oscmd.whoami().then(userName => {
                    this.sysInfo.userName = userName // admin
                });
            }
        } catch (err) { log.error(err); }
        try {
            this.sysInfo.operatingSystem = os.oos().name;
            this.sysInfo.platform = os.platform().toString();
            this.sysInfo.hostname = os.hostname();
            this.sysInfo.type = os.type();
            this.sysInfo.arch = os.arch();
            // it gives length error
            this.sysInfo.ip = os.ip();
        } catch (err) { log.error(err); }
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
            let dbValue: MemorySummary;
            try {
                //dbValue = await this.db.query(this.ms._id);
                dbValue = first(await this.db.find({
                    selector: {
                        tag: this.ms.tag
                    }
                }));
            } catch (err) {
                console.log(err);
                log.error(err);
            }
            if (dbValue && dbValue.time) {
                lastSyncTime = new Date(dbValue.time);
            }
            else {
                this.ms.time = now;
            }
            const durationDiff = dateDiff(lastSyncTime, now);
            // console.log('summary', { dbValue, lastSyncTime, durationDiff });
            // store 
            this.ms.totalMemMb = fm.totalMemMb;
            this.ms.lastFreeMemMb = fm.freeMemMb;
            this.ms.percentage = 100 - Math.trunc(fm.freeMemMb / fm.totalMemMb * 100);
            this.ms.avgTotalFreeMemMb += this.ms.percentage;
            this.ms.avgTotalDurationSeconds = (durationDiff.milliseconds || 0) / 1000;
            this.ms.count += 1;
            this.ms.calc();
            // console.log(this.ms);

            if (durationDiff.minutes >= this.config.ramUtilizationSummaryDurationMinutes) {
                let store = { ...this.ms };
                store.tag = 'avg_mem';
                //store._id = store.tag + ' as at ' + store.time.toString();
                store._id = guid();
                // store the overvall data for reporting
                upsert(store);
                log.info(store.tag, this.ms);
                this.ms.reset();
            }
            await upsert(this.ms);
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
        try {
            this.sysInfo.uptimeSeconds = os.uptime();
        } catch (err) { log.error(err); }
        if (this.config.cpuAvgLoadTime) {
            // use "top" command to cross check the result
            // execute this command to create fake load: "stress --cpu 3"  (linux)
            // in windows use consume.exe
            const { info, warning, danger } = this.config.cpuAvgLoadTime;
            const type = 'cpu';
            let done = false;
            //TODO it is not working in Windows returning 0
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
            this.checkAndRaiseEvent({ type, eventType, data, reporter: this });
            return true;
        }
        return false;
    }
}
/** Operating system related details */
export class OperatingSystemDetail {
    userName: string;
    operatingSystem: string;
    platform: string;
    hostname: string;
    ip: string;
    type: string;
    arch: string;
    uptimeSeconds: number;
}
/** To calculate RAM summary over the period of time */
export class MemorySummary {
    _id: string;
    tag: string = 'mem_overvall_status';
    time: Date;
    /** Total installed RAM MB */
    totalMemMb: number = 0;
    /** Free memory as at last sync */
    lastFreeMemMb: number = 0;
    /** RAM utilization percentage as at last sync */
    percentage: number = 0;
    /** Accumulated value of total free RAM from last reset */
    avgTotalFreeMemMb: number = 0;
    /** count of interval of accumulation */
    avgTotalDurationSeconds: number = 0;
    /** count of interval of accumulation */
    count: number = 0;
    /** Overall percentage utilization as per current data */
    avgPercentage: number = 0;
    // not printing in console.log auto
    //get summary(): number {
    calc() {
        this.avgPercentage = 0;
        if (this.avgTotalFreeMemMb && this.count) {
            this.avgPercentage = 100 - Math.trunc(this.avgTotalFreeMemMb / this.count);
        }
    }
    reset(): void {
        this.time = new Date();
        this.avgTotalFreeMemMb = 0;
        this.count = 0;
    }
    constructor() {
        this.time = new Date();
        this._id = this.tag;
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