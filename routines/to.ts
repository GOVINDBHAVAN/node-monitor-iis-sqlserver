// https://blog.grossman.io/how-to-write-async-await-without-try-catch-blocks-in-javascript/
/**
 * Receives a promise and then resolve the success response to an array with the return data as second item.
 * And the Error received from the catch as the first.
 * @param {} promise A promise function to execute
 */
export default function to(promise) {
    return promise.then(data => {
        return [null, data];
    })
        .catch(err => [err]);
}