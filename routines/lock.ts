const { EventEmitter } = require('events');

//http://thecodebarbarian.com/mutual-exclusion-patterns-with-node-promises.html

export class Lock {
    static _locked: boolean;
    static _ee: EventEmitter;
    constructor() {
        Lock._locked = false;
        Lock._ee = new EventEmitter();
    }

    acquire() {
        return new Promise(resolve => {
            // If nobody has the lock, take it and resolve immediately
            if (!Lock._locked) {
                // Safe because JS doesn't interrupt you on synchronous operations,
                // so no need for compare-and-swap or anything like that.
                Lock._locked = true;
                return resolve();
            }

            // Otherwise, wait until somebody releases the lock and try again
            const tryAcquire = () => {
                if (!Lock._locked) {
                    Lock._locked = true;
                    Lock._ee.removeListener('release', tryAcquire);
                    return resolve();
                }
            };
            Lock._ee.on('release', tryAcquire);
        });
    }

    release() {
        // Release the lock immediately
        Lock._locked = false;
        setImmediate(() => Lock._ee.emit('release'));
    }
}