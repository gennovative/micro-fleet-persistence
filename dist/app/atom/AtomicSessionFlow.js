"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const objection_1 = require("objection");
const back_lib_common_util_1 = require("back-lib-common-util");
const back_lib_common_contracts_1 = require("back-lib-common-contracts");
/**
 * Provides method to execute queries on many database connections, but still make
 * sure those queries are wrapped in transactions.
 */
class AtomicSessionFlow {
    /**
     *
     * @param {string[]} names Only executes the queries on connections with specified names.
     */
    constructor(_dbConnector, names) {
        this._dbConnector = _dbConnector;
        this._sessions = [];
        this._tasks = [];
        this.initSessions(names);
    }
    /**
     * Checks if it is possible to call "pipe()".
     */
    get isPipeClosed() {
        return (this._finalPromise != null);
    }
    /**
     * Returns a promise which resolves to the output of the last query
     * on primary (first) connection.
     * This method must be called at the end of the pipe chain.
     */
    closePipe() {
        if (!this.isPipeClosed) {
            this._finalPromise = this._initPromise
                .then(transPromises => {
                // Clean up
                this._initPromise = null;
                let finalPromise = Promise.all(transPromises)
                    .then(outputs => outputs[0]);
                // Wrap in an array to pass to next "then",
                // as we don't want to wait for it now.
                return [finalPromise];
            })
                .then(([finalPromise]) => {
                this.loop();
                return finalPromise;
            });
        }
        return this._finalPromise;
    }
    /**
     * Adds a task to session, it will be executed inside transaction of each connections
     * This method is chainable and can only be called before `closePipe()` is invoked.
     */
    pipe(task) {
        if (this.isPipeClosed) {
            throw new back_lib_common_util_1.MinorException('Pipe has been closed!');
        }
        this._tasks.push(task);
        return this;
    }
    initSessions(names) {
        return this._initPromise = new Promise(resolveInit => {
            let transPromises = [], conns = this._dbConnector.connections, len = conns.length, i = 0;
            // For each connection, we start a new transaction.
            conns.forEach(knexConn => {
                if (names && names.length && !names.includes(knexConn.customName)) {
                    return;
                }
                objection_1.transaction(knexConn, trans => {
                    let promise = this.wrapTransaction(knexConn, trans);
                    transPromises.push(promise);
                    i++;
                    // Last connection
                    if (i == len) {
                        resolveInit(transPromises);
                    }
                    // Transaction is commited if this promise resolves.
                    // Otherwise, it is rolled back.
                    // This is how ObjectionJS transaction works.
                    return promise;
                });
            });
        });
    }
    wrapTransaction(knexConn, knexTrans) {
        return new Promise((resolve, reject) => {
            this._sessions.push(new back_lib_common_contracts_1.AtomicSession(knexConn, knexTrans, resolve, reject));
        })
            .catch(err => this.rejectAllTransactions(err));
    }
    loop(prevOutputs) {
        let prevWorks = this.doTask(prevOutputs);
        if (!prevWorks) {
            return;
        }
        prevWorks
            .then(prev => {
            this.loop(prev);
        })
            .catch(err => this.rejectAllTransactions(err));
    }
    doTask(prevOutputs) {
        let task = this._tasks.shift();
        prevOutputs = prevOutputs || [];
        if (!task) {
            // When there's no more task, we commit all transactions.
            this._sessions.forEach((s, i) => s.resolve(prevOutputs[i]));
            this._sessions = this._tasks = null; // Clean up
            return null;
        }
        // Execute each task on all connections (transactions).
        return Promise.all(this._sessions.map((s, i) => task(s, prevOutputs[i])));
    }
    rejectAllTransactions(error) {
        this._sessions.forEach(s => s.reject(error));
        return Promise.reject(error);
    }
}
exports.AtomicSessionFlow = AtomicSessionFlow;

//# sourceMappingURL=AtomicSessionFlow.js.map
