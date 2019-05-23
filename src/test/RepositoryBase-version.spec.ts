import { expect } from 'chai'

import { MinorException, PagedArray, ModelAutoMapper } from '@micro-fleet/common'
import { IdGenerator } from '@micro-fleet/id-generator'

import {
    RepositoryBase, EntityBase, IDatabaseConnector,
    KnexDatabaseConnector, AtomicSessionFactory, AtomicSessionFlow
} from '../app'
import DB_DETAILS from './database-details'


const DB_TABLE = 'userdata_version',
    IMPOSSIBLE_ID = '0'

class UserVersionDTO implements ISoftDeletable, IVersionControlled {

    public static readonly translator: ModelAutoMapper<UserVersionDTO> = new ModelAutoMapper(UserVersionDTO)

    // NOTE: Class properties must be initialized, otherwise they
    // will disappear in transpiled code.
    public id: string = undefined
    public name: string = undefined
    public age: number = undefined
    public deletedAt: Date = undefined
    public createdAt: Date = undefined
    public version: number = undefined
    public isMain: boolean = undefined
}

class UserVersionEntity extends EntityBase {
    /**
     * @override
     */
    public static get tableName(): string {
        return DB_TABLE
    }

    public static readonly idColumn = ['id']
    public static readonly uniqColumn = ['name', 'age']

    public static readonly translator: ModelAutoMapper<UserVersionEntity> = new ModelAutoMapper(UserVersionEntity)

    // NOTE: Class properties must be initialized, otherwise they
    // will disappear in transpiled code.
    public id: string = undefined
    public name: string = undefined
    public age: number = undefined
    public deletedAt: string = undefined
    public createdAt: string = undefined
    public version: number = undefined
    public isMain: boolean = undefined
}

class UserVersionRepo extends RepositoryBase<UserVersionEntity, UserVersionDTO> {

    private _sessionFactory: AtomicSessionFactory

    constructor(
        dbConnector: IDatabaseConnector
    ) {
        super(UserVersionEntity, UserVersionDTO, dbConnector, {
            isVersionControlled: true,
            triggerProps: ['name'],
        })
        this._sessionFactory = new AtomicSessionFactory(dbConnector)
    }

    public createCoupleWithTransaction(adam: UserVersionDTO, eva: UserVersionDTO): Promise<UserVersionDTO[]> {
        return this._sessionFactory.startSession()
            .pipe(atomicSession => this.create(adam, { atomicSession }))
            .pipe((atomicSession, createdAdam) => {
                if (!createdAdam) {
                    debugger
                    // In fact, this scenario should never happen.
                    // Because when we come to this point, the previous task must have been successfull.
                    return Promise.reject('Cannot live without my husband!')
                }
                return this.create(eva, { atomicSession })
                    .then(createdEva => [createdAdam, createdEva])
            })
            .closePipe()
    }

    private _counter = 0
    public firstOutput: any
    public failOnSecondTransaction(adam: UserVersionDTO, eva: UserVersionDTO): Promise<UserVersionDTO[]> {
        return this._sessionFactory.startSession()
            .pipe(atomicSession => this.create(adam, { atomicSession }))
            .pipe((atomicSession, createdAdam) => {
                this._counter++
                // If this is transaction of the second connection
                if (this._counter == 2) {
                    return new Promise((_, reject) => {
                        // Delay here to let first transaction to finish,
                        // but throw MinorException before it resolves.
                        setTimeout(() => {
                            reject(new MinorException('Error on second transaction'))
                        }, 100)
                    })
                } else {
                    return new Promise((resolve, _) => {
                        this.create(eva, { atomicSession })
                            .then(createdEva => {
                                this.firstOutput = [createdAdam, createdEva]
                                // First transaction has finished but not yet resolves,
                                // it must delay here to let second transaction to fail
                                setTimeout(() => {
                                    resolve(this.firstOutput)
                                }, 200)
                            })
                    })
                }
            })
            .closePipe()
    }

    public createSessionPipe(adam: UserVersionDTO, eva: UserVersionDTO): AtomicSessionFlow {
        return this._sessionFactory.startSession()
            .pipe(atomicSession => this.create(adam, { atomicSession }))
            .pipe((atomicSession, createdAdam) => {
                if (!createdAdam) {
                    debugger
                    // In fact, this scenario should never happen.
                    // Because when we come to this point, the previous task must have been successfull.
                    return Promise.reject('Cannot live without my husband!')
                }
                return this.create(eva, { atomicSession })
                    .then(createdEva => [createdAdam, createdEva])
            })
        // .closePipe() // Not closing pipe
    }

    public createEmptyPipe(adam: UserVersionDTO, eva: UserVersionDTO): AtomicSessionFlow {
        return this._sessionFactory.startSession()
            .pipe(session => {
                return Promise.resolve('Nothing')
            })
        // .closePipe() // Not closing pipe
    }

    public async find(id: string): Promise<UserVersionDTO> {
        const foundEnt: UserVersionEntity = await this._processor.executeQuery(query => {
            return query.findById(id as any)
        }, null)

        return this._processor.toDomainModel(foundEnt, false) as UserVersionDTO
    }

    public deleteAll(): Promise<void> {
        return this._processor.executeQuery(query => query.delete())
    }
}

let cachedDTO: UserVersionDTO,
    globalDbConnector: IDatabaseConnector,
    usrRepo: UserVersionRepo

const idGen = new IdGenerator()

// These test suites make real changes to SqlLite file or PostgreSQl server.
describe.skip('RepositoryBase-version', function () {
    this.timeout(50000)

    beforeEach('Initialize db adapter', () => {
        globalDbConnector = new KnexDatabaseConnector()
        // // For SQLite3 file
        // dbConnector.addConnection({
        // clientName: DbClient.SQLITE3,
        // filePath: CONN_FILE,
        // })

        // // For PostgreSQL
        globalDbConnector.init(DB_DETAILS)
        usrRepo = new UserVersionRepo(globalDbConnector)
    })

    afterEach('Tear down db adapter', async () => {
        await globalDbConnector.dispose()
        globalDbConnector = null
    })

    describe('create', () => {
        it('should insert with version number', async () => {
            // Arrange
            const model = new UserVersionDTO()
            model.id = idGen.nextBigInt().toString()
            model.name = 'Hiri'
            model.age = 29

            // Act
            const createdDTO: UserVersionDTO = cachedDTO = await usrRepo.create(model) as UserVersionDTO

            // Assert
            expect(createdDTO).to.be.not.null
            expect(createdDTO.id).to.equal(model.id)
            expect(createdDTO.name).to.equal(model.name)
            expect(createdDTO.age).to.equal(model.age)
            expect(createdDTO.version).to.equal(1)
        })

        /*
        it('should throw error if not success on all connections', async () => {
            // Arrange
            const model = new UserVersionDTO()
            model.id = idGen.nextBigInt().toString()
            model.name = 'Hiri'
            model.age = 29

            dbConnector.addConnection({
                clientName: DbClient.SQLITE3,
                filePath: CONN_FILE_2,
            })

            // Act
            try {
                const createdDTO: UserVersionDTO = await usrRepo.create(model)
                expect(createdDTO).to.be.null
            } catch (ex) {
                expect(ex).to.be.not.null
            }
        })
        //*/
    }) // END describe 'create'

    describe('patch', () => {
        it('should create new version if trigger properties is modified', async () => {
            // Arrange
            const newName = 'Kara'

            // Act
            const partial = await usrRepo.patch({ id: cachedDTO.id, name: newName }) as Partial<UserVersionDTO>,
                refetchedDTO: UserVersionDTO = await usrRepo.findByPk(cachedDTO.id)

            // Assert
            expect(partial.id).to.equal(cachedDTO.id)
            expect(partial.name).to.equal(newName)
            expect(partial.version).to.equal(2)
            expect(refetchedDTO).to.be.not.null
            expect(refetchedDTO.id).to.equal(cachedDTO.id)
            expect(refetchedDTO.name).to.equal(cachedDTO.name)
            expect(refetchedDTO.age).to.equal(newName)
            expect(refetchedDTO.version).to.equal(partial.version)
        })

        it('should return `null` if not found', async () => {
            // Arrange
            const newAge = 45

            // Act
            const partial = await usrRepo.patch({ id: IMPOSSIBLE_ID, age: newAge }) as Partial<UserVersionDTO>,
                refetchedDTO: UserVersionDTO = await usrRepo.findByPk(IMPOSSIBLE_ID)

            // Assert
            expect(partial).to.be.null
            // If `patch` returns `null`, but we actually find an entity with the id, then something is wrong.
            expect(refetchedDTO).to.be.null
        })
    }) // END describe 'patch'

    describe('exists', () => {
        it('should return `true` if found', async () => {
            // Act
            const isExisting: boolean = await usrRepo.exists({
                    name: cachedDTO.name,
                }, {
                    excludeDeleted: false,
                })

            // Assert
            expect(isExisting).to.be.true
        })

        it('should return `false` if not found', async () => {
            // Act
            const isExisting: boolean = await usrRepo.exists({
                name: 'blah',
            })

            // Assert
            expect(isExisting).to.be.false
        })
    }) // END describe 'exists'

    describe('findByPk', () => {
        it('should return an model instance if found', async () => {
            // Act
            const foundDTO: UserVersionDTO = await usrRepo.findByPk(cachedDTO.id)

            // Assert
            expect(foundDTO).to.be.not.null
            expect(foundDTO.id).to.equal(cachedDTO.id)
            expect(foundDTO.name).to.equal(cachedDTO.name)
            expect(foundDTO.age).to.equal(cachedDTO.age)
            expect(foundDTO.version).to.equal(1)
        })

        it('should return `null` if not found', async () => {
            // Act
            const model: UserVersionDTO = await usrRepo.findByPk(IMPOSSIBLE_ID)

            // Assert
            expect(model).to.be.null
        })
    }) // END describe 'findByPk'

    describe('update', () => {
        it('should create new version if trigger properties is modified', async () => {
            // Arrange
            const newName = 'Brian',
                updatedDTO: UserVersionDTO = Object.assign(new UserVersionDTO, cachedDTO)
            updatedDTO.name = newName

            // Act
            const modified = await usrRepo.update(updatedDTO) as UserVersionDTO,
                refetchedDTO: UserVersionDTO = await usrRepo.findByPk(cachedDTO.id)

            // Assert
            expect(modified).to.exist
            expect(modified.id).to.equal(cachedDTO.id)
            expect(modified.name).to.equal(newName)
            expect(modified.version).to.equal(2)
            expect(refetchedDTO).to.be.not.null
            expect(refetchedDTO.id).to.equal(cachedDTO.id)
            expect(refetchedDTO.name).to.equal(newName)
            expect(refetchedDTO.age).to.equal(cachedDTO.age)
            expect(refetchedDTO.version).to.equal(modified.version)
        })

        it('should return `null` if not found', async () => {
            // Arrange
            const newName = 'Brian',
                updatedDTO: UserVersionDTO = Object.assign(new UserVersionDTO, cachedDTO)
            updatedDTO.id = IMPOSSIBLE_ID
            updatedDTO.name = newName

            // Act
            const modified = await usrRepo.update(updatedDTO) as UserVersionDTO,
                refetchedDTO: UserVersionDTO = await usrRepo.findByPk(updatedDTO.id)

            // Assert
            expect(modified).to.be.null
            // If `update` returns `null`, but we actually find an entity with the id, then something is wrong.
            expect(refetchedDTO).to.be.null
        })
    }) // END describe 'update'

    /*
    describe('delete (soft)', () => {
        it('should return a possitive number and the record is still in database', async () => {
            // Act
            const affectedRows: number = await usrRepo.deleteSoft(cachedDTO.id),
                refetchedDTO: UserVersionDTO = await usrRepo.findByPk(cachedDTO.id)

            // Assert
            expect(affectedRows).to.be.greaterThan(0)
            // If `delete` is successful, we must be able to still find that entity with the id.
            expect(refetchedDTO).to.exist
            expect(refetchedDTO.deletedAt).to.exist
        })

        it('should return 0 if no affected records', async () => {
            // Act
            const affectedRows: number = await usrRepo.deleteSoft(IMPOSSIBLE_ID)

            // Assert
            expect(affectedRows).to.be.equal(0)
        })
    })

    describe('recover', () => {
        it('should return a possitive number if success', async () => {
            // Act
            const affectedRows: number = await usrRepo.recover(cachedDTO.id),
                refetchedDTO: UserVersionDTO = await usrRepo.findByPk(cachedDTO.id)

            // Assert
            expect(affectedRows).to.be.greaterThan(0)
            expect(refetchedDTO).to.exist
            expect(refetchedDTO.deletedAt).to.be.null
        })

        it('should return 0 if no affected records', async () => {
            // Act
            const affectedRows: number = await usrRepo.recover(IMPOSSIBLE_ID)

            // Assert
            expect(affectedRows).to.be.equal(0)
        })

        it('should throw error if there is an active record with same unique keys', async () => {
            // Act
            try {
                const affectedRows: number = await usrRepo.recover(cachedDTO.id)
                expect(affectedRows).not.to.exist
            } catch (ex) {
                expect(ex).to.be.instanceOf(MinorException)
                expect(ex.message).to.equal('DUPLICATE_UNIQUE_KEY')
            }
        })
    })
    //*/

    describe('delete (hard)', () => {
        it('should return a possitive number if found', async () => {
            // Act
            const affectedRows: number = await usrRepo.deleteHard(cachedDTO.id),
                refetchedDTO: UserVersionDTO = await usrRepo.findByPk(cachedDTO.id)

            // Assert
            expect(affectedRows).to.be.greaterThan(0)
            // If `delete` is successful, but we still find an entity with the id, then something is wrong.
            expect(refetchedDTO).to.be.null
        })

        it('should return 0 if not found', async () => {
            // Act
            const affectedRows: number = await usrRepo.deleteHard(IMPOSSIBLE_ID),
                refetchedDTO: UserVersionDTO = await usrRepo.findByPk(IMPOSSIBLE_ID)

            // Assert
            expect(affectedRows).to.equal(0)
            // If `delete` returns 0, but we actually find an entity with the id, then something is wrong.
            expect(refetchedDTO).to.be.null
        })
    }) // END describe 'delete'

    describe('page', () => {
        it('Should return `null` if there is no records', async () => {
            // Arrange
            const PAGE = 1,
                SIZE = 10

            // Deletes all from DB
            await usrRepo.deleteAll()

            // Act
            const models: PagedArray<UserVersionDTO> = await usrRepo.page(PAGE, SIZE, {
                excludeDeleted: false,
            })

            // Assert
            expect(models).to.be.null
        })

        it('Should return specified number of items if there are more records in database', async () => {
            // Arrange
            const PAGE = 1,
                SIZE = 10,
                TOTAL = SIZE * 2
            let model: UserVersionDTO

            // Deletes all from DB
            await usrRepo.deleteAll()

            for (let i = 0; i < TOTAL; i++) {
                model = new UserVersionDTO()
                model.id = idGen.nextBigInt().toString()
                model.name = 'Hiri' + i
                model.age = Math.ceil(29 * Math.random())
                await usrRepo.create(model)
            }

            // Act
            const models: PagedArray<UserVersionDTO> = await usrRepo.page(PAGE, SIZE)

            // Assert
            expect(models).to.be.not.null
            expect(models.length).to.be.equal(SIZE)
            expect(models.total).to.be.equal(TOTAL)
        })
    }) // END describe 'page'

    describe('countAll', () => {
        it('Should return a positive number if there are records in database.', async () => {
            // Act
            const count = await usrRepo.countAll()

            // Assert
            expect(count).to.be.greaterThan(0)
        })

        it('Should return 0 if there is no records in database.', async () => {
            // Deletes all from DB
            await usrRepo.deleteAll()

            // Act
            const count = await usrRepo.countAll({ excludeDeleted: false })

            // Assert
            expect(count).to.equal(0)
        })
    }) // END describe 'count'

})
