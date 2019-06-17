/// <reference types="debug" />
const debug: debug.IDebugger = require('debug')('mcft:persistence:test:PgRepoBaseBatch')

import { expect } from 'chai'

import { ModelAutoMapper, SingleId, Maybe } from '@micro-fleet/common'
import { IdGenerator } from '@micro-fleet/id-generator'

import { PgCrudRepositoryBase, EntityBase, IRepository, IDatabaseConnector,
        KnexDatabaseConnector, AtomicSessionFactory } from '../app'
import DB_DETAILS from './database-details'


const DB_TABLE = 'usersBatch',
    IMPOSSIBLE_IDs = [new SingleId('0'), new SingleId('-1')]

class UserBatchDTO {

    public static readonly translator: ModelAutoMapper<UserBatchDTO> = new ModelAutoMapper(UserBatchDTO)

    // NOTE: Class properties must be initialized, otherwise they
    // will disappear in transpiled code.
    public id: string = undefined
    public name: string = undefined
    public age: number = undefined
}


class UserBatchEntity extends EntityBase {
    /**
     * @override
     */
    public static get tableName(): string {
        return DB_TABLE
    }

    public static readonly idColumn = ['id']
    public static readonly uniqColumn = ['name', 'age']

    public static readonly translator: ModelAutoMapper<UserBatchEntity> = new ModelAutoMapper(UserBatchEntity)

    // NOTE: Class properties must be initialized, otherwise they
    // will disappear in transpiled code.
    public id: string = undefined
    public name: string = undefined
    public age: number = undefined
}

class UserBatchRepo
    extends PgCrudRepositoryBase<UserBatchEntity, UserBatchDTO>
    implements IRepository<UserBatchDTO> {

    private _sessionFactory: AtomicSessionFactory

    constructor(
        dbConnector: IDatabaseConnector
    ) {
        super(UserBatchEntity, UserBatchDTO, dbConnector)
        this._sessionFactory = new AtomicSessionFactory(dbConnector)
    }

    protected get pkCol(): string[] {
        return UserBatchEntity.idColumn
    }

    protected get pkProp(): string[] {
        return UserBatchEntity.idProp
    }

    protected get ukCol(): string[] {
        return UserBatchEntity.uniqColumn
    }


    public createTwoCouplesWithTransaction(adams: UserBatchDTO[], evas: UserBatchDTO[]): Promise<UserBatchDTO[]> {
        return this._sessionFactory.startSession()
            .pipe(atomicSession => {
                debug(`Creating Adam 1`)
                return this.create(adams[0], { atomicSession })
            })
            .pipe((atomicSession, firstAdam) => {
                debug(`Creating Adam 2`)
                return this.create(adams[1], { atomicSession })
                    .then(secondAdam => [firstAdam, secondAdam])
            })
            .pipe((atomicSession, createdAdams) => {
                if (!createdAdams) {
                    // In fact, this scenario should never happen.
                    // Because when we come to this point, the previous task must have been successfull.
                    return Promise.reject('Cannot live without our husbands!')
                }
                debug('Creating Eva 1')
                return this.create(evas[0], { atomicSession })
                    .then(firstEva => [...createdAdams, firstEva])
            })
            .pipe((atomicSession, adamsAndFirstEva) => {
                debug('Creating Eva 2')
                return this.create(evas[1], { atomicSession })
                    .then(secondEva => [...adamsAndFirstEva, secondEva])
            })
            .closePipe()
    }

    public deleteAll(): Promise<void> {
        return this.executeQuery(query => query.delete())
    }
}

let cachedDTOs: UserBatchDTO[],
    globalDbConnector: IDatabaseConnector,
    usrRepo: UserBatchRepo

const idGen = new IdGenerator()

// These test suites make real changes to database.
describe('RepositoryBase-batch', function() {
    // this.timeout(50000)

    beforeEach('Initialize db adapter', () => {
        globalDbConnector = new KnexDatabaseConnector()
        // // For SQLite3 file
        // dbConnector.addConnection({
            // clientName: DbClient.SQLITE3,
            // fileName: CONN_FILE,
        // })

        // // For PostgreSQL
        globalDbConnector.init(DB_DETAILS)
        usrRepo = new UserBatchRepo(globalDbConnector)
    })

    afterEach('Tear down db adapter', async () => {
        await globalDbConnector.dispose()
        globalDbConnector = null
    })

    describe('create with transaction', () => {

        it('should rollback all transactions when a query fails either on one or all transactions', async () => {
            // Arrange
            try {
                await usrRepo.deleteAll()
            } catch (ex) {
                // Empty
            }

            const adamOne = new UserBatchDTO(),
                adamTwo = new UserBatchDTO(),
                evaOne = new UserBatchDTO(),
                evaTwo = new UserBatchDTO()

            adamOne.id = idGen.nextBigInt().toString()
            adamOne.name = 'Adam One'
            adamOne.age = 11

            adamTwo.id = idGen.nextBigInt().toString()
            adamTwo.name = 'Adam Two'
            adamTwo.age = 22

            evaOne.id = idGen.nextBigInt().toString()
            evaOne.name = 'Eva One'
            evaOne.age = 33

            evaTwo.id = idGen.nextBigInt().toString()
            evaTwo.name = null // fail
            evaTwo.age = 44

            try {
                // Act
                const output = await usrRepo.createTwoCouplesWithTransaction([adamOne, adamTwo], [evaOne, evaTwo])
                expect(output).not.to.exist
            } catch (error) {
                // Assert
                expect(error).to.exist
                expect(error.message).to.include('violates not-null constraint')
            }
            // Assert
            const count = await usrRepo.countAll()
            expect(count).to.equal(0)
        })

        it('should insert four rows on each database', async () => {
            // Arrange
            const adamOne = new UserBatchDTO(),
                adamTwo = new UserBatchDTO(),
                evaOne = new UserBatchDTO(),
                evaTwo = new UserBatchDTO()

            adamOne.id = idGen.nextBigInt().toString()
            adamOne.name = 'Adam One'
            adamOne.age = 11

            adamTwo.id = idGen.nextBigInt().toString()
            adamTwo.name = 'Adam Two'
            adamTwo.age = 22

            evaOne.id = idGen.nextBigInt().toString()
            evaOne.name = 'Eva One'
            evaOne.age = 33

            evaTwo.id = idGen.nextBigInt().toString()
            evaTwo.name = 'Eva Two'
            evaTwo.age = 44

            const sources = [adamOne, adamTwo, evaOne, evaTwo]

            try {
                // Act
                const output = await usrRepo.createTwoCouplesWithTransaction([adamOne, adamTwo], [evaOne, evaTwo])
                cachedDTOs = [output[0], output[1]] // Reused in below tests

                // Assert
                expect(output).to.exist
                expect(output.length).to.equal(4)

                output.forEach((u, i) => {
                    expect(u.id).to.equal(sources[i].id)
                    expect(u.name).to.equal(sources[i].name)
                    expect(u.age).to.equal(sources[i].age)
                })

                // Clean up
                output.splice(0, 2)
                await usrRepo.deleteMany(output.map(u => new SingleId(u.id)))
            } catch (err) {
                console.error(err)
                expect(err).not.to.exist
            }
        })

    })

    describe('deleteMany (hard)', () => {
        it('should return a possitive number if found', async () => {
            // Act
            const affectedRows: number = await usrRepo.deleteMany([new SingleId(cachedDTOs[0].id), new SingleId(cachedDTOs[1].id)]),
                refetchedOne: Maybe<UserBatchDTO> = await usrRepo.findByPk(new SingleId(cachedDTOs[0].id)),
                refetchedTwo: Maybe<UserBatchDTO> = await usrRepo.findByPk(new SingleId(cachedDTOs[1].id))

            // Assert
            expect(affectedRows).to.be.equal(2)
            // If hard `delete` is successful, but we still find an entity with the id, then something is wrong.
            expect(refetchedOne.isNothing).to.be.true
            expect(refetchedTwo.isNothing).to.be.true
        })

        it('should return 0 if not found', async () => {
            // Act
            const affectedRows: number = await usrRepo.deleteMany(IMPOSSIBLE_IDs),
                refetchedOne: Maybe<UserBatchDTO> = await usrRepo.findByPk(IMPOSSIBLE_IDs[0]),
                refetchedTwo: Maybe<UserBatchDTO> = await usrRepo.findByPk(IMPOSSIBLE_IDs[1])

            // Assert
            expect(affectedRows).to.equal(0)
            // If hard `delete` returns 0, but we actually find an entity with the id, then something is wrong.
            expect(refetchedOne.isNothing).to.be.true
            expect(refetchedTwo.isNothing).to.be.true
        })
    }) // END describe 'deleteMany (hard)'
})
