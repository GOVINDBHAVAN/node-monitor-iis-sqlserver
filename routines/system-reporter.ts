import { BaseReporter, Config } from './reporter'
import { cpu, drive } from 'node-os-utils';
import log from '../config/log';

export class SystemReporter extends BaseReporter {

    constructor(config: Config) {
        super(config);
    }
    check(): void {
        // Load average – is the average system load calculated over a given period of time of 1, 5 and 15 minutes.
        // The numbers are read from left to right, and the output above means that:
        // 1.98, 2.15, 2.21
        // load average over the last 1 minute is 1.98
        // load average over the last 5 minutes is 2.15
        // load average over the last 15 minutes is 2.21
        log.info(`Avg 1 min load ${cpu.loadavgTime(1)}`);
        log.info(`Avg 5 min load ${cpu.loadavgTime(5)} `);
        cpu.usage()
            .then(cpuPercentage => {
                this.emit('data', cpuPercentage);
            })

        // const osCmd = osu.oscmd

        // osCmd.whoami()
        //     .then(userName => {
        //         console.log(userName) // admin
        //     })
    }

}