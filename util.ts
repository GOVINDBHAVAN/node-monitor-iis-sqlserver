import { env } from './config/config';
import { v4 as uuid } from 'uuid';

export const isdev: boolean = env == 'development';

/** Generate GUID v4 */
export function guid() {
    const id: string = uuid();
    return id;
}

export async function sleep(milliseconds: number): Promise<void> {
    let timer = await new Promise(res => setTimeout(res, milliseconds));
    return;
}

export function dateDiff(start, end) {
    let milliseconds = (end - start); // milliseconds between end and start
    let days = Math.floor(milliseconds / 86400000); // days
    let hours = Math.floor((milliseconds % 86400000) / 3600000); // hours
    let minutes = Math.round(((milliseconds % 86400000) % 3600000) / 60000); // minutes
    return { days, hours, minutes, milliseconds };
}
