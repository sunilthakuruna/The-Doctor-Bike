import {snapshotHandler} from '../snapshot-store.js';

export const onRequest=snapshotHandler('service_reminders',['serviceReminderLogs']);
