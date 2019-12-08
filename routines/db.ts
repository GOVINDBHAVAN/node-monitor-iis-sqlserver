import PouchDB from 'pouchdb';
import log from '../config/log';
export const db = new PouchDB('monitor.db');
export function init() {
    db.info()
        .then(info => log.info(info));
    PouchDB.plugin(require('pouchdb-find'));
    //PouchDB.plugin(require('pouchdb-upsert'));
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
export async function upsert(doc: any, post: boolean): Promise<any> {
    console.log('doc', post, doc);

    if (post) {
        try {
            await db.post(doc);
            return;
        }
        catch (err) {
            log.error(err);
            console.error(err);
        };
    }
    try {
        // added {force: true} Conflicting happen when you try to update a document without _rev or the revision of your documents outdated (deleted from revision tree).
        // So, to update without a valid _rev. You can set options force equal true
        await db.put(doc, { force: true });
    }
    catch (err) {
        log.error(err);
        console.error(err);
    };
}

export function printAll() {
    db.allDocs({ include_docs: true, descending: true })
        .then(function (result) {
            console.log(result);

        }).catch(function (err) {
            console.log(err);
        });
}