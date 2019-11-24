import { EventEmitter } from 'events';

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
}

export class Config {
    intervalSeconds: number;
}

export class BaseReporter extends EventEmitter implements Reporter {
    constructor(public config: Config) {
        super();
        this.on('data', (data: any) => this.onMsg(data));
        this.registerCheck();
    }
    registerCheck() {
        setInterval(this.check.bind(this), this.config.intervalSeconds * 1000);
        // this.check();
    }
    check(): void {
        this.emit('data', null);
    }
    onMsg(data): void {
        this.emit('onMsg', data);
    }
}