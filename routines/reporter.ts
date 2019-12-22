import { EventEmitter } from 'events';
import { os } from 'node-os-utils';
import log from '../config/log';

export interface Reporter {
    /**
     * Provide configuration to setup the reporter
     */
    config: Config;
    /**
     * To register the check method to be called as per specified internal
     */
    registerCheck(): void;
    /**
     * Do the checking every specified interval
     */
    check(): void;
    /**
     * Event occur when receive data
    */
    onMsg(data): void;
    /**
     * Event occur when alert event occur
    */
    onAlert(event: NotificationType): void;
    /**
     * Event occur when alert event occur
    */
    onWarning(event: NotificationType): void;
    /**
     * Event occur when alert event occur
    */
    onDanger(event: NotificationType): void;
}

export interface Config {
    intervalSeconds: number;
}
/** to provide interval duration and comparison unit to fire the event */
export interface InputUnit {
    /** interval to get the value for comparison */
    interval?: number;
    /** threshold value returns from system for alert/warning/danger event firing */
    threshold?: number;
}
/** Measurement of alerts info, warning, danger */
export interface AlertInput {
    /** informational alert only */
    info?: InputUnit;
    /** a sign of warning */
    warning?: InputUnit;
    /** a sign of danger */
    danger?: InputUnit;
}
export enum NotificationEventType {
    ALERT = 0, WARNING = 1, DANGER = 2
};
export interface NotificationType {
    /** notification time */
    now: Date;
    /** type of notification CPU, RAM, Harddisk, IIS etc. */
    type: string;
    /** type of event alert, warning, danger */
    eventType: NotificationEventType;
    /** data related to event */
    data: any;
    /** Instance of SystemInformation to fetch further detail */
    sysInfo: OperatingSystemDetail;
}

/** Operating system related details */
export class OperatingSystemDetail {
    userName: string;
    //operatingSystem: string;
    platform: string;
    hostname: string;
    ip: string;
    type: string;
    arch: string;
    uptimeSeconds: number;
}

export class BaseReporter extends EventEmitter implements Reporter {
    static sysInfo: OperatingSystemDetail;
    constructor(public config: Config) {
        super();
        this.on('data', (data: any) => this.onMsg(data));
        this.on('alert', (data: NotificationType) => this.onAlert(data));
        this.on('warning', (data: NotificationType) => this.onWarning(data));
        this.on('danger', (data: NotificationType) => this.onDanger(data));
        this.registerCheck();
        this.syncCheckOSDetails();
    }
    static systemInformation(): string {
        let rtn = JSON.stringify(this.sysInfo);
        return rtn;
    }
    /** Sync function to fetch OS details */
    syncCheckOSDetails() {
        if (BaseReporter.sysInfo != null) return;
        console.log('checking sysinfo for', this.config);

        BaseReporter.sysInfo = new OperatingSystemDetail();
        // try {
        //     if (oscmd) {
        //         oscmd.whoami().then(userName => {
        //             this.sysInfo.userName = userName // admin
        //         });
        //     }
        // } catch (err) { log.error(err); }
        try {
            // this.sysInfo.operatingSystem = os.oos().name;
            BaseReporter.sysInfo.platform = os.platform().toString();
            BaseReporter.sysInfo.hostname = os.hostname();
            BaseReporter.sysInfo.type = os.type();
            BaseReporter.sysInfo.arch = os.arch();
            //it gives length error
            //this.sysInfo.ip = os.ip();
        } catch (err) { log.error(err); }
    }
    registerCheck() {
        setInterval(this.check.bind(this), this.config.intervalSeconds * 1000);
        // this.check();
    }
    checkSystemUptime() {
        try {
            BaseReporter.sysInfo.uptimeSeconds = os.uptime();
        } catch (err) { log.error(err); }
    }
    check(): void {
        this.emit('data', null);
    }
    onMsg(data): void {
        this.emit('onMsg', data);
    }
    checkAndRaiseEvent(event: NotificationType): void {
        let eventType = NotificationEventType[event.eventType].toString().toLowerCase();
        // console.log(`raise ${eventType}`, event);
        this.emit(eventType, event);
    }
    /**
    * Event occur when alert event occur
    */
    onAlert(event: NotificationType): void { }
    /**
     * Event occur when alert event occur
    */
    onWarning(event: NotificationType): void { }
    /**
     * Event occur when alert event occur
    */
    onDanger(event: NotificationType): void { }

}