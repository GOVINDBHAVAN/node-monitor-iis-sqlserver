// import * as util from '../util';
// to load variables from .env file into process.env
// import * as dotenv from "dotenv";
export const env = process.env.NODE_ENV || 'development';
//export const env = process.env.NODE_ENV || 'development';

// dotenv.config({ path: envpath });


const cfg = updateProcessEnv('./config.json');
// now update secret key data which are not on git 
updateProcessEnv('./secret.json');

//https://stackoverflow.com/questions/41762570/how-to-export-object-in-typescript/41762681
export default cfg[env];

function updateProcessEnv(path: string) {
    const cfg = require(path);
    let envConfig = cfg[env];
    Object.keys(envConfig).forEach(key => {
        process.env[key] = envConfig[key];
    });
    return cfg;
}
//export let lookup: { [key: string]: any } = () => process.env;

//export const config = process.env;
// module.exports = {
//     ...this,
//     //[key: string]: string | undefined;
// }