import PouchDB from 'pouchdb';
import log from '../config/log';
export const db = new PouchDB('monitor.db');
export function init() {
    db.info()
        .then(info => log.info(info));
    PouchDB.plugin(require('pouchdb-find'));
    // const doc = {
    //     _id: new Date().toISOString(),
    //     name: 'Peter',
    //     age: 23,
    //     occupation: 'designer'
    // };

    // db.put(doc).then((res) => {
    //     console.log("Document inserted OK");
    // }).catch((err) => {
    //     console.error(err);
    // });
}
export function printAll() {
    db.allDocs({ include_docs: true, descending: true })
        .then(function (result) {
            console.log(result);

        }).catch(function (err) {
            console.log(err);
        });
}