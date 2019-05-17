import { IDependencyContainer, serviceContext } from '@micro-fleet/common'

import { IDatabaseConnector } from './connector/IDatabaseConnector'
import { KnexDatabaseConnector } from './connector/KnexDatabaseConnector'
import { DatabaseAddOn } from './DatabaseAddOn'
import { Types } from './Types'


export function registerDbAddOn(): DatabaseAddOn {
    const depCon: IDependencyContainer = serviceContext.dependencyContainer
    if (!depCon.isBound(Types.DB_CONNECTOR)) {
        depCon.bind<IDatabaseConnector>(Types.DB_CONNECTOR, KnexDatabaseConnector).asSingleton()
    }
    if (!depCon.isBound(Types.DB_ADDON)) {
        depCon.bind<DatabaseAddOn>(Types.DB_ADDON, DatabaseAddOn).asSingleton()
    }
    const addon = depCon.resolve<DatabaseAddOn>(Types.DB_ADDON)
    return addon
}
