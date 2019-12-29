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
    enable: boolean;
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
    /** check if this event is real event where data exceeds threashold or informational data only */
    isAlert: boolean;
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
    static db: PouchDB.Database;

    constructor(public config: Config, public db: PouchDB.Database) {
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
        if (this.config.enable) {
            setInterval(this.check.bind(this), this.config.intervalSeconds * 1000);
        }
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
    protected internalCheckAndFire(input: InputUnit, type: string, eventType: NotificationEventType, result?: number
        , reverse?: boolean
        , furtherDetail?: {} | {}): boolean {
        // log.info(`${type} ${NotificationEventType[eventType]} : ${result}`);
        let eventTypeString = NotificationEventType[eventType].toString().toLowerCase();
        console.log(`${type} eventType ${eventType} eventTypeString: ${eventTypeString}, result: ${result}, threshold: ${input.threshold}`);

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
        if (result) {
            const data = { notification: 'alert', type, result, threshold: input.threshold, eventTypeString, furtherDetail };
            let isAlert = false;
            if (input.threshold
                && (!reverse ? (result >= input.threshold) : (result < input.threshold))
            ) {
                isAlert = true;
            }
            let eventData: NotificationType = { now: new Date(), type, eventType, data, sysInfo: BaseReporter.sysInfo, isAlert };
            if (isAlert) {
                // save only if this is an geniune alert
                this.saveInDB(data);
            }
            this.checkAndRaiseEvent(eventData);
            return true;
        }
        return false;
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

    protected saveInDB(data: any) {
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
}