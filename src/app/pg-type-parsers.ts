import { types } from 'pg'
// import * as moment from 'moment'

// PostgreSQL data type OID
const TIMESTAMPTZ_OID = 1184, // Timestamp without timezone
    TIMESTAMP_OID = 1114, // Timestamp with timezone
    DATE_OID = 1082,
    BIGINT_OID = 20

/**
 * This piece of code makes sure all date values loaded from database are converted
 * as UTC format.
 */
/* istanbul ignore next */
const parseDate = function(val: string) {
    // Use this if you want Entity classes have Date OBJECT properties.
    // return val === null ? null : moment(val).toDate()

    // Use this if you want Entity classes have Date STRING properties.
    return val
}

types.setTypeParser(TIMESTAMPTZ_OID, parseDate)
types.setTypeParser(TIMESTAMP_OID, parseDate)
types.setTypeParser(DATE_OID, parseDate)

// pg returns big integers as string by default
// We want to cast Postgres big integer to Node BigInt
types.setTypeParser(BIGINT_OID, (val: string) => BigInt(val))
