import { types } from 'pg';
import * as moment from 'moment';

// PostgreSQL data type OID
const TIMESTAMPTZ_OID = 1184, // Timestamp without timezone
	TIMESTAMP_OID = 1114, // Timestamp with timezone
	DATE_OID = 1082;

/**
 * This piece of code makes sure all date values loaded from database are converted
 * as UTC format.
 */
let parseFn = function(val) {
	return val === null ? null : moment(val).toDate();
};

types.setTypeParser(TIMESTAMPTZ_OID, parseFn);
types.setTypeParser(TIMESTAMP_OID, parseFn);
types.setTypeParser(DATE_OID, parseFn);