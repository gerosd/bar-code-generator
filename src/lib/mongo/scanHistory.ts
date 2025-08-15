import type {Collection, Filter} from 'mongodb';
import {getCollection} from './client';
import {executeMongoOperation} from './utils';

const MONITORING_COLLECTION_NAME = 'scanHistory';

