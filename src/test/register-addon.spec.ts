import * as chai from 'chai'
import * as spies from 'chai-spies'
chai.use(spies)
const expect = chai.expect
import { IDependencyContainer, DependencyContainer, serviceContext } from '@micro-fleet/common'

import { registerDbAddOn, IDatabaseConnector, KnexDatabaseConnector,
    DatabaseAddOn, Types as T } from '../app'


describe('registerDbAddOn', function () {
    // this.timeout(60000) // For debuging

    let depCon: IDependencyContainer

    beforeEach(() => {
        depCon = new DependencyContainer()
        serviceContext.setDependencyContainer(depCon)
    })

    afterEach(() => {
        depCon.dispose()
        depCon = null
    })

    it('Should register dependencies if not already', () => {
        // Act
        registerDbAddOn()

        // Assert
        expect(depCon.isBound(T.DB_CONNECTOR)).to.be.true
        expect(depCon.isBound(T.DB_ADDON)).to.be.true
    })

    it('Should not register dependencies if already registered', () => {
        // Arrange
        depCon.bind<IDatabaseConnector>(T.DB_CONNECTOR, KnexDatabaseConnector)
        depCon.bind<DatabaseAddOn>(T.DB_ADDON, DatabaseAddOn)
        chai.spy.on(depCon, 'bind')

        // Act
        registerDbAddOn()

        // Assert
        // tslint:disable-next-line: no-unbound-method
        expect(depCon.bind).not.to.be.called
    })
}) // describe
