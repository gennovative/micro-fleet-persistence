import { transaction } from 'objection'
import { MinorException, Maybe } from '@micro-fleet/common'

import { IDatabaseConnector } from '../connector/IDatabaseConnector'
import { AtomicSession } from './AtomicSession'


export type SessionTask = (session: AtomicSession, previousOutput?: any) => Promise<any>

/**
 * Provides method to execute queries on many database connections, but still make
 * sure those queries are wrapped in transactions.
 */
export class AtomicSessionFlow {

    private _session: AtomicSession
    private _tasks: SessionTask[]
    private _initPromise: Promise<any>
    private _finalPromise: Promise<any>
    private _abortFn: (reason: any) => void

    /**
     *
     * @param {string[]} names Only executes the queries on connections with specified names.
     */
    constructor(protected _dbConnector: IDatabaseConnector) {
        this._tasks = []
        this._initSession()
    }

    /**
     * Checks if it is possible to call "pipe()".
     */
    public get isPipeClosed(): boolean {
        return (this._finalPromise != null)
    }


    /**
     * Returns a promise which resolves to the output of the last query
     * on primary (first) connection.
     * This method must be called at the end of the pipe chain.
     */
    public closePipe(): Promise<any> {
        if (!this.isPipeClosed) {
            this._finalPromise = new Promise(async (resolve, reject) => {
                this._abortFn = reject
                try {
                    const {transProm} = await this._initPromise
                    // Clean up
                    this._initPromise = null

                    // Start executing enqueued tasks
                    this._loop()

                    // Waits for all transaction to complete,
                    // but only takes output from last operation.
                    // `transPromises` resolves when `resolveAllTransactions` is called,
                    // and rejects when ``rejectAllTransactions()` is called.
                    const outputs = await transProm
                    resolve(outputs)
                }
                // Error on init transaction
                catch (err) { reject(err) }
            })
        }

        return this._finalPromise
    }

    /**
     * Adds a task to be executed inside transaction.
     * This method is chainable and can only be called before `closePipe()` is invoked.
     */
    public pipe(task: SessionTask): AtomicSessionFlow {
        if (this.isPipeClosed) {
            throw new MinorException('Pipe has been closed!')
        }

        this._tasks.push(task)
        return this
    }


    private _initSession(): void {
        const knexConn = this._dbConnector.connection
        this._initPromise = new Promise(resolve => {
                const transProm = transaction(knexConn, trans => {
                    this._session = new AtomicSession(knexConn, trans)
                    // Avoid passing a promise to resolve(),
                    // as it will wait forever
                    resolve({ transProm })
                    return null
                })
        })
    }

    private _doTask(prevOutput: any): Maybe<Promise<any[]>> {
        const task = this._tasks.shift()

        if (!task) {
            // When there's no more task, we commit all transactions.
            this._resolveTransactions(prevOutput)
            return Maybe.Nothing()
        }

        return Maybe.Just(task(this._session, prevOutput))
    }

    private _loop(prevOutput?: any): void {
        const curTask = this._doTask(prevOutput)
        if (curTask.isNothing) {
            return
        }

        curTask.value
            .then(output => {
                this._loop(output)
            })
            .catch(err => this._rejectTransactions(err))
            // This catches both promise errors and AtomicSessionFlow's errors.
            .catch(this._abortFn)
    }

    private _resolveTransactions(output: any): void {
        // tslint:disable-next-line: no-floating-promises
        this._session.knexTransaction.commit(output) // Causes `transProm` to resolve
        this._session = this._tasks = null // Clean up
    }

    private _rejectTransactions(error: any): void {
        // tslint:disable-next-line: no-floating-promises
        this._session.knexTransaction.rollback(error) // Causes `transProm` to reject
        this._session = this._tasks = null // Clean up
    }
}
