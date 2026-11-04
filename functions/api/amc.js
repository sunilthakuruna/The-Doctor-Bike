import {snapshotHandler} from '../snapshot-store.js';

export const onRequest=snapshotHandler('amc',['amcPlans','amcReminderLogs']);
