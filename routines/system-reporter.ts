import { BaseReporter, Config, AlertInput, NotificationType, NotificationEventType, InputUnit } from './reporter'
import { cpu, drive, mem } from 'node-os-utils';
import log from '../config/log';

export class SystemReporter extends BaseReporter {

    // if uncomment then it create object of base config not this child config.
    config: SystemReporterConfig;
    constructor(config: SystemReporterConfig) {
        super(config);
        this.config = config;
    }
    check(): void {
        this.checkCpu();
        this.checkDisk();
        this.checkMem();
    }
    checkMem(): void {
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
        if (this.config.freeMemPercentage) {
            const { info, warning, danger } = this.config.freeMemPercentage;
            const type = 'mem';
            mem.free().then(fm => {
                let done = false;
                const { totalMemMb, freeMemMb } = fm;
                if (totalMemMb <= 0) { log.info('totalMemMb is zero'); return };
                const perc = Math.trunc(freeMemMb / totalMemMb * 100);
                if (!done && danger) { done = this.internalCheckAndFire(danger, type, NotificationEventType.DANGER, perc, true); }
                if (!done && warning) { done = this.internalCheckAndFire(warning, type, NotificationEventType.WARNING, perc, true); }
                if (!done && info) { done = this.internalCheckAndFire(info, type, NotificationEventType.ALERT, perc, true); }
            });
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

    private internalCheckAndFire(input: InputUnit, type: string, eventType: NotificationEventType, result?: number
        , reverse?: boolean): boolean {
        // log.info(`${type} ${NotificationEventType[eventType]} : ${result}`);
        if (result
            && input.threshold
            && (!reverse ? (result >= input.threshold) : (result < input.threshold))
        ) {
            const data = { result, threshold: input.threshold };
            this.checkAndRaiseEvent({ type, eventType, data });
            return true;
        }
        return false;
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