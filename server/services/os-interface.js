"use strict";
const { Client } = require("@opensearch-project/opensearch");
const AWS = require("aws-sdk");
const createAwsOpensearchConnector = require("aws-opensearch-connector");

/**
 * @type {Client | null}
 */
let client = null;

module.exports = ({ strapi }) => ({
  
  /**
 * Initializes the search engine with the given configuration.
 *
 * @param {Object} config - The configuration object for the search engine.
 * @param {boolean} config.useAwsConnector - Indicates whether to use the AWS connector.
 * @param {string} config.host - The host address of the search engine.
 * @param {string} config.uname - The username for authentication.
 * @param {string} config.password - The password for authentication.
 * @param {string} config.cert - The certificate for secure connection.
 * @returns {Promise<void>} A promise that resolves when the search engine is initialized.
 */
  async initializeSearchEngine({
    useAwsConnector,
    host,
    cert,
    rejectUnauthorized,
  }) {
    let auth = "";
    try {
      if (useAwsConnector) {
        // client = new Client({
        //   ...createAwsOpensearchConnector(AWS.config),
        //   node: host,
        // });

        const awsConfig = new AWS.Config({
          region: region,
          credentials: new AWS.CredentialProviderChain()
        });

        console.log("awsConfig --> ", awsConfig);

        client = new Client({
          ...createAwsOpensearchConnector(awsConfig),
          node: host,
        });

      } else {
        client = new Client({
          node: host,
          ssl: {
            rejectUnauthorized: rejectUnauthorized,
            cert: cert,
          },
        });
      }
    } catch (err) {
      console.log("err when making connection to opensearch :: ", err);
      {
        if (err.message.includes("ECONNREFUSED")) {
          console.error(
            "strapi-plugin-opensearch : Connection to OpenSearch at ",
            host,
            " refused."
          );
          console.error(err);
        } else {
          console.error(
            "strapi-plugin-opensearch : Error while initializing connection to OpenSearch."
          );
          console.error(err);
        }
        throw err;
      }
    }
  },

  async createIndex(indexName) {
    try {
      const exists = await client.indices.exists({ index: indexName });
      if (!exists) {
        console.log(
          "strapi-plugin-opensearch : Search index ",
          indexName,
          " does not exist. Creating index."
        );

        await client.indices.create({
          index: indexName,
        });
      }
    } catch (err) {
      if (err.message.includes("ECONNREFUSED")) {
        console.log(
          "strapi-plugin-opensearch : Error while creating index - connection to opensearch refused."
        );
        console.log(err);
      } else {
        console.log("strapi-plugin-opensearch : Error while creating index.");
        console.log(err);
      }
    }
  },

  async indexDataToSpecificIndex({ itemId, itemData }, iName) {
    try {
      await client.index({
        index: iName,
        // id: itemId,
        body: itemData,
      });
      await client.indices.refresh({ index: iName });
    } catch (err) {
      console.log(
        "strapi-plugin-opensearch : Error encountered while indexing data to opensearch."
      );
      console.log(err);
      throw err;
    }
  },

  async indexData({ itemId, itemData }) {
    const pluginConfig = await strapi.config.get("plugin.opensearch");
    return await this.indexDataToSpecificIndex(
      { itemId, itemData },
      pluginConfig.indexAliasName
    );
  },

  async searchData(searchQuery) {
    try {
      const pluginConfig = await strapi.config.get("plugin.opensearch");
      const result = await client.search({
        index: pluginConfig.indexAliasName,
        ...searchQuery,
      });
      return result;
    } catch (err) {
      console.log(
        "Search : opensearchClient.searchData : Error encountered while making a search request to opensearch."
      );
      throw err;
    }
  },
  async checkOSConnection() {
    if (!client) return false;
    try {
      // TODO : why connection is not working
      let res = await client.ping();
      return true;
    } catch (error) {
      console.error(
        "strapi-plugin-opensearch : Could not connect to Opensearch."
      );
      console.error(JSON.stringify(error));
      return false;
    }
  },
  async attachAliasToIndex(indexName) {
    try {
      const pluginConfig = await strapi.config.get("plugin.opensearch");

      const aliasName = pluginConfig.indexAliasName;
      console.log({aliasName})

      const aliasExists = await client.indices.existsAlias({ name: aliasName });

      if (aliasExists.body) {
        console.log(
          "strapi-plugin-opensearch : Alias with this name already exists, removing it."
        );
        await client.indices.deleteAlias({ index: "*", name: aliasName });
      }
      
      const indexExists = await client.indices.exists({ index: indexName });
      if (!indexExists) await this.createIndex(indexName);
      console.log(
        "strapi-plugin-opensearch : Attaching the alias ",
        aliasName,
        " to index : ",
        indexName
      );
      console.log({indexName, aliasName})
      let aliasPutSuccess = await client.indices.putAlias({ index: indexName, name: aliasName });
      console.log("aliasPutSuccess", aliasPutSuccess)
    } catch (err) {
      if (err.message.includes("ECONNREFUSED")) {
        console.log(
          "strapi-plugin-opensearch : Attaching alias to the index - Connection to opensearch refused."
        );
        console.log(err);
      } else {
        console.log(
          "strapi-plugin-opensearch : Attaching alias to the index - Error while setting up alias within opensearch."
        );
        console.log(err);
      }
    }
  },
  async deleteIndex(indexName) {
    try {
      await client.indices.delete({
        index: indexName,
      });
    } catch (err) {
      if (err.message.includes("ECONNREFUSED")) {
        console.log(
          "strapi-plugin-opensearch : Connection to opensearch refused."
        );
        console.log(err);
      } else {
        console.log(
          "strapi-plugin-opensearch : Error while deleting index to opensearch."
        );
        console.log(err);
      }
    }
  },
});
