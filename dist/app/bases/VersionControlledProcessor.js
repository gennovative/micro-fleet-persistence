"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AtomicSessionFactory_1 = require("../atom/AtomicSessionFactory");
const MonoProcessor_1 = require("./MonoProcessor");
const VersionQueryBuilder_1 = require("./VersionQueryBuilder");
class VersionControlledProcessor extends MonoProcessor_1.MonoProcessor {
    constructor(EntityClass, DtoClass, dbConnector, options = {}) {
        super(EntityClass, DtoClass, dbConnector, options);
        this._triggerProps = options.triggerProps;
        this._queryBuilders.push(new VersionQueryBuilder_1.VersionQueryBuilder(EntityClass));
        this._atomFac = new AtomicSessionFactory_1.AtomicSessionFactory(dbConnector);
    }
    create(model, opts = {}) {
        let entity = this.toEntity(model, false);
        if (!entity['version']) {
            entity['version'] = model['version'] = 1;
        }
        return this.executeQuery(query => query.insert(entity), opts.atomicSession)
            .then(() => model);
    }
    patch(model, opts = {}) {
        if (this._isIntersect(Object.keys(model), this._triggerProps)) {
            return this._saveAsNew(null, model);
        }
        return super.patch.apply(this, arguments);
    }
    update(model, opts = {}) {
        if (this._isIntersect(Object.keys(model), this._triggerProps)) {
            return this._saveAsNew(null, model);
        }
        return super.update.apply(this, arguments);
    }
    async _saveAsNew(pk, updatedModel) {
        let source = await this.findByPk(pk || updatedModel);
        if (!source) {
            return null;
        }
        let flow = this._atomFac.startSession();
        flow
            .pipe(s => {
            updatedModel['isMain'] = false;
            return super.patch(updatedModel);
        })
            .pipe(s => {
            let clone = Object.assign({}, source, updatedModel, { version: source['version'] + 1 });
            return this.create(clone);
        });
        return flow.closePipe();
    }
    _isIntersect(arr1, arr2) {
        for (let a of arr1) {
            if (arr2.includes(a)) {
                return true;
            }
        }
        return false;
    }
}
exports.VersionControlledProcessor = VersionControlledProcessor;
//# sourceMappingURL=VersionControlledProcessor.js.map