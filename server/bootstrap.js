"use strict";

module.exports = async ({ strapi }) => {
  // const pluginConfig = await strapi.config.get('plugin.opensearch');
  const pluginConfig = await strapi.config.get("plugin.opensearch");
  console.log("Direct plugin config:", pluginConfig);

  const configureIndexingService =
    strapi.plugins["opensearch"].services.configureIndexing;
  const scheduleIndexingService =
    strapi.plugins["opensearch"].services.scheduleIndexing;
  const osInterface = strapi.plugins["opensearch"].services.osInterface;
  const indexer = strapi.plugins["opensearch"].services.indexer;
  const helper = strapi.plugins["opensearch"].services.helper;

  try {
    await configureIndexingService.initializeStrapiOpensearch();

    if (!Object.keys(pluginConfig).includes("indexingCronSchedule"))
      console.warn(
        "The plugin strapi-plugin-opensearch is enabled but the indexingCronSchedule is not configured."
      );
    else if (!Object.keys(pluginConfig).includes("searchConnector"))
      console.warn(
        "The plugin strapi-plugin-opensearch is enabled but the searchConnector is not configured."
      );
    else {
      const connector = pluginConfig["searchConnector"];
      await osInterface.initializeSearchEngine({
        useAwsConnector: pluginConfig["useAwsConnector"],
        host: connector.host,
        cert: connector.certificate,
        rejectUnauthorized: connector.rejectUnauthorized,
      });
      strapi.cron.add({
        opensearchIndexing: {
          task: async ({ strapi }) => {
            await indexer.indexPendingData();
          },
          options: {
            rule: pluginConfig["indexingCronSchedule"],
          },
        },
      });

      if (await osInterface.checkOSConnection()) {
        //Attach the alias to the current index:
        const idxName = await helper.getCurrentIndexName();
        await osInterface.attachAliasToIndex(idxName);
      }
    }

    strapi.db.lifecycles.subscribe(async (event) => {
      if (event.action === "afterCreate" || event.action === "afterUpdate") {
        if (strapi.opensearch.collections.includes(event.model.uid)) {
          //collection without draft-publish
          if (typeof event.model.attributes.publishedAt === "undefined") {
            await scheduleIndexingService.addItemToIndex({
              collectionUid: event.model.uid,
              recordId: event.result.id,
            });
          } else if (event.model.attributes.publishedAt) {
            if (event.result.publishedAt) {
              await scheduleIndexingService.addItemToIndex({
                collectionUid: event.model.uid,
                recordId: event.result.id,
              });
            } else {
              //unpublish
              await scheduleIndexingService.removeItemFromIndex({
                collectionUid: event.model.uid,
                recordId: event.result.id,
              });
            }
          }
        }
      }
      //bulk publish-unpublish from list view
      if (
        event.action === "afterCreateMany" ||
        event.action === "afterUpdateMany"
      ) {
        if (strapi.opensearch.collections.includes(event.model.uid)) {
          if (Object.keys(event.params.where.id).includes("$in")) {
            const updatedItemIds = event.params.where.id["$in"];
            //bulk unpublish
            if (
              typeof event.params.data.publishedAt === "undefined" ||
              event.params.data.publishedAt === null
            ) {
              for (let k = 0; k < updatedItemIds.length; k++) {
                await scheduleIndexingService.removeItemFromIndex({
                  collectionUid: event.model.uid,
                  recordId: updatedItemIds[k],
                });
              }
            } else {
              for (let k = 0; k < updatedItemIds.length; k++) {
                await scheduleIndexingService.addItemToIndex({
                  collectionUid: event.model.uid,
                  recordId: updatedItemIds[k],
                });
              }
            }
          }
        }
      }
      if (event.action === "afterDelete") {
        if (strapi.opensearch.collections.includes(event.model.uid)) {
          await scheduleIndexingService.removeItemFromIndex({
            collectionUid: event.model.uid,
            recordId: event.result.id,
          });
        }
      }
      if (event.action === "afterDeleteMany") {
        if (strapi.opensearch.collections.includes(event.model.uid)) {
          if (
            Object.keys(event.params.where).includes("$and") &&
            Array.isArray(event.params.where["$and"]) &&
            Object.keys(event.params.where["$and"][0]).includes("id") &&
            Object.keys(event.params.where["$and"][0]["id"]).includes("$in")
          ) {
            const deletedItemIds = event.params.where["$and"][0]["id"]["$in"];
            for (let k = 0; k < deletedItemIds.length; k++) {
              await scheduleIndexingService.removeItemFromIndex({
                collectionUid: event.model.uid,
                recordId: deletedItemIds[k],
              });
            }
          }
        }
      }
    });
    configureIndexingService.markInitialized();
  } catch (err) {
    console.error(
      "An error was encountered while initializing the strapi-plugin-opensearch plugin."
    );
    console.error(err);
  }
};
