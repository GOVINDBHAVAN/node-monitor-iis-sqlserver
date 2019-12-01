import fs from 'fs';
import path from 'path';
// to load variables from .env file into process.env
// import * as dotenv from "dotenv";
export const env = process.env.NODE_ENV || 'development';

// dotenv.config({ path: envpath });


const filePath = path.join(path.resolve(__dirname, "../config/config.json"));
console.log(filePath);

const cfg = updateProcessEnv(filePath);
if (!cfg) {
    throw new Error(`config.json file not available on path: ${filePath}`);
}
// now update secret key data which are not on git 
updateProcessEnv(path.join(path.resolve(__dirname, "../config/secret.json")));

//https://stackoverflow.com/questions/41762570/how-to-export-object-in-typescript/41762681
export default cfg;

function updateProcessEnv(path: string) {
    try {
        if (fs.existsSync(path)) {
            const cfg = require(path);
            let envConfig = cfg[env];
            Object.keys(envConfig).forEach(key => {
                process.env[key] = envConfig[key];
            });
            return process.env;
        }
    } catch (err) {
        console.error(err)
    }
    return null;
}
//export let lookup: { [key: string]: any } = () => process.env;

//export const config = process.env;
// module.exports = {
//     ...this,
//     //[key: string]: string | undefined;
// }