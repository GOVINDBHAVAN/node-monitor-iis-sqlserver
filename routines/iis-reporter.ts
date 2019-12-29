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
        this.loadLocalConfig();
        this.db = db;
        this.config = config;
    }
    loadLocalConfig() {
        this.loadDataFromServer = Boolean(process.env['IIS_DATA_FROM_SERVER'] || false);
    }
    check(): void {
        this.checkIIS();
    }
    /** Returns true then to check other notification type:
     * True means current notificationEventType is executed and sent
     */
    async internalCheckIIS(notificationEventType: NotificationEventType, input?: InputUnit) {
        if (!input || !input.threshold) return { result: [], notificationEventType, input };
        // let eventTypeString = NotificationEventType[notificationEventType].toString().toLowerCase();
        let thresholdSeconds = input.threshold;
        if (!thresholdSeconds || thresholdSeconds <= 0) return { result: [], notificationEventType, input };
        let result = await this.fetchIIS(thresholdSeconds);

        let rtn: IISRequestData[] = [];
        for (let i = 0; i < result.length; i++) {
            const r = result[i];
            let s = r.timeSeconds;
            if (s >= thresholdSeconds) {
                //this.internalCheckAndFire(input, type, notificationEventType, s, true, { r, 'unit': 'seconds' });
                rtn.push(r);
            }
        }
        return { result: rtn, notificationEventType, input };
    }

    async checkIIS(): Promise<void> {
        const type = 'iis';
        let dangerResult = await this.internalCheckIIS(NotificationEventType.DANGER, this.config.executionSeconds.danger);
        let warningResult = await this.internalCheckIIS(NotificationEventType.WARNING, this.config.executionSeconds.warning);
        let infoResult = await this.internalCheckIIS(NotificationEventType.ALERT, this.config.executionSeconds.info);
        //console.log(_.findIndex(dangerResult, j => j.url === '/mccannwg/api/attendance/reprocessForCompilation?id=a6409ab0-a54e-4f85-8496-aa4d00ffe23a'));
        _.remove(warningResult.result, r => _.findIndex(dangerResult.result, j => j.requestName === r.requestName) >= 0);
        _.remove(infoResult.result, r => _.findIndex(dangerResult.result, j => j.requestName === r.requestName) >= 0);
        _.remove(infoResult.result, r => _.findIndex(warningResult.result, j => j.requestName === r.requestName) >= 0);
        if (dangerResult.result.length || warningResult.result.length || infoResult.result.length) {
            let result = dangerResult;
            if (!dangerResult.result.length && warningResult.result.length) {
                result = warningResult;
            } else if (!dangerResult.result.length && !warningResult.result.length) {
                result = infoResult;
            }
            let max = _.maxBy(result.result, r => r.timeSeconds).timeSeconds;
            this.internalCheckAndFire(result.input, type, result.notificationEventType, max, false,
                {
                    danger: this.AddType(dangerResult.result, 'danger'),
                    warning: this.AddType(warningResult.result, 'warning'),
                    info: this.AddType(infoResult.result, 'info')
                });
        }
    }
    AddType(result: IISRequestData[], type: string) {
        let newResult = _.map(result, r => {
            return {
                ...r, type
            }
        });
        return newResult;
    }
    async fetchIIS(thresholdSeconds: number) {
        try {
            //"/home/govind/Documents/projects/monitor/dist/routines"
            let obj = await this.getJsonData(thresholdSeconds);
            return obj;
        } catch (e) {
            console.log("e", e);
        }
    }

    private async getJsonData(thresholdSeconds: number) {
        if (this.loadDataFromServer) {
            return this.filterData(await this.internalGetJsonDataFromServer(thresholdSeconds) as unknown as IISRequestData[]);
        }
        else {
            return this.filterData(await this.internalGetJsonDataFromFile(thresholdSeconds));
        }
    }
    private filterData(json: IISRequestData[]) {
        if (!this.config.appPoolsToCheck || this.config.appPoolsToCheck.length <= 0) return json;
        var upperCaseNames = this.config.appPoolsToCheck.map(function (value) {
            return value.toUpperCase();
        });
        let filtered = _.filter(json, (r: IISRequestData) => (!r.url
            || upperCaseNames.indexOf(r.url.toUpperCase()) < 0));
        return filtered;
    }
    private convertToObj(json: any): IISRequestData[] {
        if (!json || !json.appcmd || !json.appcmd.REQUEST) return [];
        let requests = json.appcmd.REQUEST;

        let obj = _.map(requests, r => {
            let rtn = new IISRequestData();
            let d = r.$;
            rtn.appPoolName = d["APPPOOL.NAME"];
            rtn.clientIP = d["ClientIp"];
            rtn.timeSeconds = Math.trunc(d["Time"] / 1000);
            rtn.url = d["Url"];
            rtn.verb = d["Verb"];
            rtn.requestName = d["REQUEST.NAME"];
            return rtn;
        });
        return obj;
    }
    private async internalGetJsonDataFromServer(thresholdSeconds: number) {
        //let process = require('child_process');
        let ms = thresholdSeconds * 1000;
        let command = `%windir%\system32\inetsrv\appcmd list requests /elapsed:${ms}`;
        let cmd: child.ChildProcess = child.spawn(command);

        cmd.stdout.on('data', function (output) {
            console.log(output.toString());
            let json = this.convertToObj(output);
            let filtered = _.filter(json, (r: IISRequestData) => r.timeSeconds >= thresholdSeconds);
            return filtered;
        });

        cmd.on('close', function () {
            console.log('Finished');
        });

        //Error handling
        cmd.stderr.on('data', function (err) {
            console.log(err);
            return [];
        });
    }
    private async internalGetJsonDataFromFile(thresholdSeconds: number) {
        let xmlData = await fs.readFile(__dirname + '/../../prototypes/iisxml.xml', 'utf-8');
        //var jsonObj = parser.parse(xmlData);
        var parser = new xml2js.Parser( /* options */);
        let json = await parser.parseStringPromise(xmlData);
        return this.convertToObj(json);
    }
}

export class IISRequestData {
    url: string;
    clientIP: string;
    timeSeconds: number;
    appPoolName: string;
    verb: string;
    requestName: string;
}

export interface IISReporterConfig extends Config {
    /** Optional to filter only selected app-pools not all, if blank then it will check all app-pools */
    appPoolsToCheck: string[];

    /** To monitor requests if exceeds this limit then alert/warning/danger notification will be generated */
    executionSeconds: AlertInput;
}
