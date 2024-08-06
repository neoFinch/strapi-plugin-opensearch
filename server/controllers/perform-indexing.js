'use strict';

module.exports = ({ strapi }) => {
    const indexer = strapi.plugins['opensearch'].services.indexer;
    const scheduleIndexingService = strapi.plugins['opensearch'].services.scheduleIndexing;
    const rebuildIndex = async (ctx) => {
        return await indexer.rebuildIndex();
    }

    const indexCollection = async (ctx) => {
        if (ctx.params.collectionname)
            return await scheduleIndexingService.addCollectionToIndex({collectionUid: ctx.params.collectionname})
        else
            return null;
    }

    const triggerIndexingTask = async (ctx) => {
        return await indexer.indexPendingData()
    }

    return {
        rebuildIndex,
        indexCollection,
        triggerIndexingTask
    };     
}