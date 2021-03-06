import { expect } from 'chai'
import * as moment from 'moment'

import { MinorException, PagedData, SingleId, Maybe, Translatable, decorators as d } from '@micro-fleet/common'

import { PgCrudRepositoryBase, ORMModelBase, IDatabaseConnector,
        KnexDatabaseConnector, AtomicSessionFactory, AtomicSessionFlow } from '../app'
import DB_DETAILS from './database-details'
import { genBigInt } from './test-utils'


const DB_TABLE = 'usersSoftDel',
    IMPOSSIBLE_ID = '0'

class UserDTO extends Translatable {

    // NOTE: Class properties must be initialized, otherwise they
    // will disappear in transpiled code.
    public id: string = undefined
    public name: string = undefined
    public age: number = undefined
    public createdAt: string = undefined
    public updatedAt: string = undefined
}


@d.translatable()
class UserORM extends ORMModelBase {
    /**
     * @override
     */
    public static get tableName(): string {
        return DB_TABLE
    }

    public static readonly idColumn = ['id']
    public static readonly uniqColumn = ['name', 'age']

    // NOTE: Class properties must be initialized, otherwise they
    // will disappear in transpiled code.
    public id: string = undefined
    public name: string = undefined
    public age: number = undefined
    public createdAt: string = undefined
    public updatedAt: string = undefined

    /**
     * [ObjectionJS]
     */
    public $beforeInsert(queryContext: any) {
        super.$beforeInsert(queryContext)
        this.createdAt = moment.utc().format()
    }

    /**
     * [ObjectionJS]
     */
    public $beforeUpdate(opt: any, queryContext: any) {
        super.$beforeUpdate(opt, queryContext)
        this.updatedAt = moment.utc().format()
    }

}


class UserRepo extends PgCrudRepositoryBase<UserORM, UserDTO, SingleId> {

    private _sessionFactory: AtomicSessionFactory

    constructor(
        dbConnector: IDatabaseConnector
    ) {
        super(UserORM, UserDTO, dbConnector)
        this._sessionFactory = new AtomicSessionFactory(dbConnector)
    }

    public createCoupleWithTransaction(adam: UserDTO, eva: UserDTO): Promise<UserDTO[]> {
        return this._sessionFactory.startSession()
            .pipe(atomicSession => this.create(adam, { atomicSession, refetch: true }))
            .pipe((atomicSession, createdAdam) => {
                if (!createdAdam) {
                    debugger
                    // In fact, this scenario should never happen.
                    // Because when we come to this point, the previous task must have been successfull.
                    return Promise.reject('Cannot live without my husband!')
                }
                return this.create(eva, { atomicSession, refetch: true })
                    .then(createdEva => [createdAdam, createdEva])
            })
            .closePipe()
    }

    public createSessionPipe(adam: UserDTO, eva: UserDTO): AtomicSessionFlow {
        return this._sessionFactory.startSession()
            .pipe(atomicSession => this.create(adam, { atomicSession, refetch: true }))
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

    public createEmptyPipe(adam: UserDTO, eva: UserDTO): AtomicSessionFlow {
        return this._sessionFactory.startSession()
            .pipe(session => {
                return Promise.resolve('Nothing')
            })
            // .closePipe() // Not closing pipe
    }

    public deleteAll(): Promise<void> {
        return this.$executeQuery(query => query.delete())
    }
}

let cachedDTO: UserDTO,
    globalDbConnector: IDatabaseConnector,
    usrRepo: UserRepo


// These test suites make real changes to database.
describe('PgCrudRepositoryBase', function() {
    // this.timeout(50000)

    beforeEach('Initialize db adapter', () => {
        globalDbConnector = new KnexDatabaseConnector()
        // // For SQLite3 file
        // dbConnector.addConnection({
            // clientName: DbClient.SQLITE3,
            // filePath: CONN_FILE,
        // })

        // // For PostgreSQL
        globalDbConnector.init(DB_DETAILS)
        usrRepo = new UserRepo(globalDbConnector)
    })

    afterEach('Tear down db adapter', async () => {
        await globalDbConnector.dispose()
        globalDbConnector = null
    })

    describe('create with transaction', () => {

        it('should insert two rows on each database', async () => {
            // Arrange
            const modelOne = new UserDTO(),
                modelTwo = new UserDTO()
            modelOne.id = genBigInt()
            modelOne.name = 'One'
            modelOne.age = 11

            modelTwo.id = genBigInt()
            modelTwo.name = 'Two'
            modelTwo.age = 22

            try {
                // Act
                const output = await usrRepo.createCoupleWithTransaction(modelOne, modelTwo)
                expect(output).to.exist

                const [createdOne, createdTwo] = output
                // Assert
                expect(createdOne).to.exist
                expect(createdOne.id).to.be.equal(modelOne.id)
                expect(createdOne.name).to.equal(modelOne.name)
                expect(createdOne.age).to.equal(modelOne.age)
                expect(moment.utc(createdOne.createdAt).isValid()).to.be.true
                expect(createdOne.updatedAt).not.to.exist

                expect(createdTwo).to.exist
                expect(createdTwo.id).to.be.equal(modelTwo.id)
                expect(createdTwo.name).to.equal(modelTwo.name)
                expect(createdTwo.age).to.equal(modelTwo.age)
                expect(moment.utc(createdTwo.createdAt).isValid()).to.be.true
                expect(createdTwo.updatedAt).not.to.exist

                // Clean up
                await Promise.all([
                    usrRepo.deleteSingle(new SingleId(createdOne.id)),
                    usrRepo.deleteSingle(new SingleId(createdTwo.id)),
                ])
            } catch (err) {
                console.error(err)
                expect(err).not.to.exist
            }
        })

        it('should rollback all transactions when a query fails either on one or all transactions', async () => {
            // Arrange
            try {
                await usrRepo.deleteAll()
            } catch (ex) {
                // Empty
            }

            const modelOne = new UserDTO(),
                modelTwo = new UserDTO()
            modelOne.id = genBigInt()
            modelOne.name = 'One'
            modelOne.age = 11

            modelTwo.id = genBigInt()
            modelTwo.name = null // fail
            modelTwo.age = 22

            try {
                // Act
                const output = await usrRepo.createCoupleWithTransaction(modelOne, modelTwo)
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

        it('should resolve same result if calling `closePipe` multiple times', async () => {
            // Arrange
            const modelOne = new UserDTO(),
                modelTwo = new UserDTO()
            modelOne.id = genBigInt()
            modelOne.name = 'One'
            modelOne.age = 11

            modelTwo.id = genBigInt()
            modelTwo.name = 'Two'
            modelTwo.age = 22

            try {
                // Act
                const flow = usrRepo.createSessionPipe(modelOne, modelTwo),
                    outputOne = await flow.closePipe(),
                    outputTwo = await flow.closePipe()

                // Assert
                expect(outputOne).to.exist
                expect(outputTwo).to.exist
                expect(outputOne[0]).to.equal(outputTwo[0])
                expect(outputOne[1]).to.equal(outputTwo[1])

                // Clean up
                await Promise.all([
                    usrRepo.deleteSingle(new SingleId(outputOne[0].id)),
                    usrRepo.deleteSingle(new SingleId(outputOne[1].id)),
                ])
            } catch (err) {
                console.error(err)
                expect(err).not.to.exist
            }
        })

        it('should throw error if calling `pipe` after `closePipe`', async () => {
            // Arrange
            const modelOne = new UserDTO(),
                modelTwo = new UserDTO()
            modelOne.id = genBigInt()
            modelOne.name = 'One'
            modelOne.age = 11

            modelTwo.id = genBigInt()
            modelTwo.name = 'Two'
            modelTwo.age = 22

            try {
                // Act
                const flow = usrRepo.createEmptyPipe(modelOne, modelTwo)

                await flow.closePipe()
                flow.pipe(s => {
                    expect(false, 'Should not go here!').to.be.true
                    return Promise.reject(null)
                })
            } catch (err) {
                // Assert
                expect(err).to.exist
                expect(err).to.be.instanceOf(MinorException)
                expect(err.message).to.equal('Pipe has been closed!')
            }
        })
    })

    describe('create without transaction', () => {
        it('should insert a row to database without transaction', async () => {
            // Arrange
            const model = new UserDTO()
            model.id = genBigInt()
            model.name = 'Hiri'
            model.age = 39

            // Act
            const createdDTO: UserDTO = cachedDTO = await usrRepo.create(model, { refetch: true }) as UserDTO

            // Assert
            expect(createdDTO).to.be.not.null
            expect(createdDTO.id).to.equal(model.id)
            expect(createdDTO.name).to.equal(model.name)
            expect(createdDTO.age).to.equal(model.age)
            expect(moment.utc(createdDTO.createdAt).isValid()).to.be.true
            expect(createdDTO.updatedAt).not.to.exist
        })

        it('should return DTO instance if success', async () => {
            // Arrange
            const model = new UserDTO()
            model.id = genBigInt()
            model.name = 'Hiri'
            model.age = 39

            // Act
            const createdDTO: UserDTO = cachedDTO = await usrRepo.create(model, { refetch: true }) as UserDTO

            // Assert
            expect(createdDTO).to.be.not.null
            expect(createdDTO).to.be.instanceOf(UserDTO)
        })
    }) // END describe 'create'

    describe('exists', () => {
        it('should return `true` if found', async () => {
            // Act
            const isExisting: boolean = await usrRepo.exists({
                name: cachedDTO.name,
                age: 123,
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
            const foundDTO: Maybe<UserDTO> = await usrRepo.findById(new SingleId(cachedDTO.id))

            // Assert
            expect(foundDTO.isJust).to.true
            expect(foundDTO.value.id).to.equal(cachedDTO.id)
            expect(foundDTO.value.name).to.equal(cachedDTO.name)
            expect(foundDTO.value.age).to.equal(cachedDTO.age)
        })

        it('should return DTO instance if success', async () => {
            // Act
            const foundDTO: Maybe<UserDTO> = await usrRepo.findById(new SingleId(cachedDTO.id))

            // Assert
            expect(foundDTO.isJust).to.be.true
            expect(foundDTO.value).to.be.instanceOf(UserDTO)
        })

        it('should return Maybe.Nothing if not found', async () => {
            // Act
            const model: Maybe<UserDTO> = await usrRepo.findById(new SingleId(IMPOSSIBLE_ID))

            // Assert
            expect(model.isNothing).to.be.true
        })
    }) // END describe 'findByPk'

    describe('patch', () => {
        it('should return the input model if not refetching', async () => {
            // Arrange
            const newAge = 45

            // Act
            const props = { id: cachedDTO.id, age: newAge}
            const partial: Maybe<Partial<UserDTO>> = await usrRepo.patch(props),
                refetchedDTO: Maybe<UserDTO> = await usrRepo.findById(new SingleId(cachedDTO.id))

            // Assert
            expect(partial.isJust).to.be.true
            expect(partial.value).to.equal(props)
            expect(refetchedDTO.isJust, 'refetchedDTO').to.be.true
            expect(refetchedDTO.value.id, 'id').to.equal(cachedDTO.id)
            expect(refetchedDTO.value.name, 'name').to.equal(cachedDTO.name)
            expect(refetchedDTO.value.age, 'age').to.equal(newAge)
            expect(refetchedDTO.value.updatedAt, 'updatedAt').to.be.not.empty
        })

        it('should return an object with updated properties if refetching is enabled', async () => {
            // Arrange
            const newAge = 45

            // Act
            const partial: Maybe<Partial<UserDTO>> = await usrRepo.patch({ id: cachedDTO.id, age: newAge}, { refetch: true }),
                refetchedDTO: Maybe<UserDTO> = await usrRepo.findById(new SingleId(cachedDTO.id))

            // Assert
            expect(partial.isJust).to.be.true
            expect(partial.value.id).to.equal(cachedDTO.id)
            expect(partial.value.age).to.equal(newAge)
            expect(partial.value.updatedAt).to.be.not.empty
            expect(refetchedDTO.isJust, 'refetchedDTO').to.be.true
            expect(refetchedDTO.value.id, 'id').to.equal(cachedDTO.id)
            expect(refetchedDTO.value.name, 'name').to.equal(cachedDTO.name)
            expect(refetchedDTO.value.age, 'age').to.equal(newAge)
            expect(refetchedDTO.value.updatedAt, 'updatedAt').to.be.not.empty
        })

        it('should return Maybe.Nothing if not found', async () => {
            // Arrange
            const newAge = 45

            // Act
            const partial: Maybe<Partial<UserDTO>> = await usrRepo.patch({ id: IMPOSSIBLE_ID, age: newAge}),
                refetchedDTO: Maybe<UserDTO> = await usrRepo.findById(new SingleId(IMPOSSIBLE_ID))

            // Assert
            expect(partial.isNothing).to.be.true
            // If `patch` returns nothing, but we actually find an entity with the id, then something is wrong.
            expect(refetchedDTO.isNothing).to.be.true
        })
    }) // END describe 'patch'

    describe('update', () => {
        it('should return the input model if not refetching', async () => {
            // Arrange
            const newName = 'Brian',
                updatedDTO: UserDTO = Object.assign(new UserDTO, cachedDTO)
            updatedDTO.name = newName

            // Act
            const modified: Maybe<UserDTO> = await usrRepo.update(updatedDTO),
                refetchedDTO: Maybe<UserDTO> = await usrRepo.findById(new SingleId(cachedDTO.id))

            // Assert
            expect(modified.isJust).to.be.true
            expect(modified.value).to.equal(updatedDTO)
            expect(refetchedDTO.isJust, 'refetchedDTO').to.be.true
            expect(refetchedDTO.value.id, 'id').to.equal(cachedDTO.id)
            expect(refetchedDTO.value.name, 'name').to.equal(newName)
            expect(refetchedDTO.value.age, 'age').to.equal(cachedDTO.age)
            expect(refetchedDTO.value.updatedAt, 'updatedAt').to.be.not.empty
        })

        it('should return an updated model if refetching is enabled', async () => {
            // Arrange
            const newName = 'Brian',
                updatedDTO: UserDTO = Object.assign(new UserDTO, cachedDTO)
            updatedDTO.name = newName

            // Act
            const modified: Maybe<UserDTO> = await usrRepo.update(updatedDTO, { refetch: true }),
                refetchedDTO: Maybe<UserDTO> = await usrRepo.findById(new SingleId(cachedDTO.id))

            // Assert
            expect(modified.isJust).to.be.true
            expect(modified.value.id).to.equal(cachedDTO.id)
            expect(modified.value.name).to.equal(newName)
            expect(modified.value.updatedAt).to.be.not.empty
            expect(refetchedDTO.isJust, 'refetchedDTO').to.be.true
            expect(refetchedDTO.value.id, 'id').to.equal(cachedDTO.id)
            expect(refetchedDTO.value.name, 'name').to.equal(newName)
            expect(refetchedDTO.value.age, 'age').to.equal(cachedDTO.age)
            expect(refetchedDTO.value.updatedAt, 'updatedAt').to.be.not.empty
        })

        it('should return DTO instance if found', async () => {
            // Arrange
            const newName = 'Vincent',
                updatedDTO: UserDTO = Object.assign(new UserDTO, cachedDTO)
            updatedDTO.name = newName

            // Act
            const modified: Maybe<UserDTO> = await usrRepo.update(updatedDTO, { refetch: true })

            // Assert
            expect(modified.isJust).to.be.true
            expect(modified.value).to.be.instanceOf(UserDTO)
        })

        it('should return Maybe.Nothing if not found', async () => {
            // Arrange
            const newName = 'Brian',
                updatedDTO: UserDTO = Object.assign(new UserDTO, cachedDTO)
            updatedDTO.id = IMPOSSIBLE_ID
            updatedDTO.name = newName

            // Act
            const modified: Maybe<UserDTO> = await usrRepo.update(updatedDTO),
                refetchedDTO: Maybe<UserDTO> = await usrRepo.findById(new SingleId(updatedDTO.id))

            // Assert
            expect(modified.isNothing).to.be.true
            // If `update` returns Maybe.Nothing, but we actually find an entity with the id, then something is wrong.
            expect(refetchedDTO.isNothing).to.be.true
        })
    }) // END describe 'update'

    /*
    describe('delete (soft)', () => {
        it('should return a possitive number and the record is still in database', async () => {
            // Act
            const affectedRows: number = await usrRepo.deleteSoft(cachedDTO.id),
                refetchedDTO: Maybe<UserDTO> = await usrRepo.findByPk(cachedDTO.id)

            // Assert
            expect(affectedRows).to.be.greaterThan(0)
            // If `delete` is successful, we must be able to still find that entity with the id.
            expect(refetchedDTO).to.exist
            expect(refetchedDTO.deletedAt).to.exist
            expect(refetchedDTO.deletedAt).to.be.instanceOf(Date)
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
                refetchedDTO: Maybe<UserDTO> = await usrRepo.findByPk(cachedDTO.id)

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

    describe('deleteSingle (hard)', () => {
        it('should return a possitive number if found', async () => {
            // Act
            const affectedRows: number = await usrRepo.deleteSingle(new SingleId(cachedDTO.id)),
                refetchedDTO: Maybe<UserDTO> = await usrRepo.findById(new SingleId(cachedDTO.id))

            // Assert
            expect(affectedRows).to.be.greaterThan(0)
            // If `delete` is successful, but we still find an entity with the id, then something is wrong.
            expect(refetchedDTO.isNothing).to.be.true
        })

        it('should return 0 if not found', async () => {
            // Act
            const affectedRows: number = await usrRepo.deleteSingle(new SingleId(IMPOSSIBLE_ID)),
                refetchedDTO: Maybe<UserDTO> = await usrRepo.findById(new SingleId(IMPOSSIBLE_ID))

            // Assert
            expect(affectedRows).to.equal(0)
            // If `delete` returns 0, but we actually find an entity with the id, then something is wrong.
            expect(refetchedDTO.isNothing).to.be.true
        })
    }) // END describe 'deleteSingle'

    describe('page', function() {
        // tslint:disable-next-line:no-invalid-this
        this.timeout(5000)

        it('Should return `null` if there is no records', async () => {
            // Arrange
            const PAGE = 1,
                SIZE = 10

            // Deletes all from DB
            await usrRepo.deleteAll()

            // Act
            const models: PagedData<UserDTO> = await usrRepo.page({
                pageIndex: PAGE,
                pageSize: SIZE,
            })

            // Assert
            expect(models.length).to.equal(0)
        })

        it('Should return first page for pageIndex=1', async () => {
            // Arrange
            const PAGE = 1,
                SIZE = 10,
                TOTAL = SIZE * 2
            let model: UserDTO

            // Deletes all from DB
            await usrRepo.deleteAll()

            // const createJobs = []
            const inputUsers: UserDTO[] = []

            for (let i = 0; i < TOTAL; ++i) {
                model = new UserDTO()
                model.id = genBigInt()
                model.name = `Hiri ${i}`
                model.age = Math.ceil(29 * Math.random())
                inputUsers.push(model)
            }

            inputUsers.sort((a, b) => parseInt(a.id) - parseInt(b.id))
            const firstPageModels: UserDTO[] = inputUsers.slice(0, 10)
            await usrRepo.createMany(inputUsers)

            // Act
            const fetchedModels: PagedData<UserDTO> = await usrRepo.page({
                pageIndex: PAGE,
                pageSize: SIZE,
                sortBy: 'id',
            })

            // Assert
            expect(fetchedModels.length).to.be.equal(SIZE)
            fetchedModels.forEach((m, i) => {
                expect(m.id, `[${i}].id`).to.equal(firstPageModels[i].id)
                expect(m.name, `[${i}].name`).to.equal(firstPageModels[i].name)
                expect(m.age, `[${i}].age`).to.equal(firstPageModels[i].age)
            })
        })

        it('Should return specified number of items if there are more records in database', async () => {
            // Arrange
            const PAGE = 2,
                SIZE = 10,
                TOTAL = SIZE * 2
            let model: UserDTO

            // Deletes all from DB
            await usrRepo.deleteAll()

            const createJobs = []

            for (let i = 0; i < TOTAL; ++i) {
                model = new UserDTO()
                model.id = genBigInt()
                model.name = `Hiri ${i}`
                model.age = Math.ceil(29 * Math.random())
                createJobs.push(usrRepo.create(model, { refetch: true }))
            }

            await Promise.all(createJobs)

            // Act
            const models: PagedData<UserDTO> = await usrRepo.page({
                pageIndex: PAGE,
                pageSize: SIZE,
                sortBy: 'id',
            })

            // Assert
            expect(models).to.be.not.null
            expect(models.length).to.be.equal(SIZE)
            expect(models.total).to.be.equal(TOTAL)
        })

        it('should return DTO instance if found', async () => {
            // Arrange
            const PAGE = 1,
                SIZE = 10
            const firstPageModel: UserDTO[] = []
            let model: UserDTO

            // Deletes all from DB
            await usrRepo.deleteAll()

            const createJobs = []

            for (let i = 0; i < SIZE; ++i) {
                model = new UserDTO()
                model.id = genBigInt()
                model.name = `Hiri ${i}`
                model.age = Math.ceil(29 * Math.random())
                firstPageModel.push(model)
                createJobs.push(usrRepo.create(model, { refetch: true }))
            }

            await Promise.all(createJobs)

            // Act
            const fetchedModels: PagedData<UserDTO> = await usrRepo.page({
                pageIndex: PAGE,
                pageSize: SIZE,
            })

            // Assert
            expect(
                fetchedModels.items.every((m: any) => m instanceof UserDTO)
            ).to.be.true
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
            const count = await usrRepo.countAll()

            // Assert
            expect(count).to.equal(0)
        })
    }) // END describe 'count'

})
