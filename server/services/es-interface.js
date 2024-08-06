const { Client } = require('@opensearch-project/opensearch')
const fs = require('fs')
const path = require('path');



let client = null;

module.exports = ({ strapi }) => ({
    async initializeSearchEngine({host, uname, password, cert}){
        try
        {
          client = new Client({
            node: host,
            auth: {
              username: uname,
              password: password
            },
            tls: {
              ca: cert,
              rejectUnauthorized: false
            }
          });
        }
        catch (err)
        {
          if (err.message.includes('ECONNREFUSED'))
          {
            console.error('strapi-plugin-opensearch : Connection to OpenSearch at ', host, ' refused.')
            console.error(err);
          }
          else
          {
            console.error('strapi-plugin-opensearch : Error while initializing connection to OpenSearch.')
            console.error(err);
          }
          throw(err);
        }
    },
    async createIndex(indexName){
      try{
        const exists = await client.indices.exists({index: indexName});
        if (!exists)
        {
          console.log('strapi-plugin-opensearch : Search index ', indexName, ' does not exist. Creating index.');
        
          await client.indices.create({
            index: indexName,
          });
        }    
      }
      catch (err)
      {
        if (err.message.includes('ECONNREFUSED'))
        {
          console.log('strapi-plugin-opensearch : Error while creating index - connection to OpenSearch refused.')
          console.log(err);
        }
        else
        {
          console.log('strapi-plugin-opensearch : Error while creating index.')
          console.log(err);
        }
      }  
    },
    async deleteIndex(indexName){
      try{
        await client.indices.delete({
          index: indexName
        });
      }
      catch(err)
      {
        if (err.message.includes('ECONNREFUSED'))
        {
          console.log('strapi-plugin-opensearch : Connection to OpenSearch refused.')
          console.log(err);
        }
        else
        {
          console.log('strapi-plugin-opensearch : Error while deleting index to OpenSearch.')
          console.log(err);
        }    
      }
    },
    async attachAliasToIndex(indexName) {
      try{
          const pluginConfig = await strapi.config.get('plugin.opensearch');
          const aliasName = pluginConfig.indexAliasName;
          const aliasExists = await client.indices.existsAlias({name: aliasName});
          if (aliasExists)
          {
            console.log('strapi-plugin-opensearch : Alias with this name already exists, removing it.');
            await client.indices.deleteAlias({index: '*', name: aliasName});
          }
          const indexExists = await client.indices.exists({index: indexName});
          if (!indexExists)
            await this.createIndex(indexName);
          console.log('strapi-plugin-opensearch : Attaching the alias ', aliasName, ' to index : ', indexName);
          await client.indices.putAlias({index: indexName, name: aliasName})
      }
      catch(err)
      {
        if (err.message.includes('ECONNREFUSED'))
        {
          console.log('strapi-plugin-opensearch : Attaching alias to the index - Connection to OpenSearch refused.')
          console.log(err);
        }
        else
        {
          console.log('strapi-plugin-opensearch : Attaching alias to the index - Error while setting up alias within OpenSearch.')
          console.log(err);
        }    
      }
    },
    async checkESConnection() {
      if (!client)
        return false;
      try {
        await client.ping();
        return true;
      }
      catch(error)
      {
        console.error('strapi-plugin-opensearch : Could not connect to Opensearch.')
        console.error(error);
        return false;
      }
      
    },
    async indexDataToSpecificIndex({itemId, itemData}, iName){
      try
      {
        await client.index({
          index: iName,
          id: itemId,
          document: itemData
        })
        await client.indices.refresh({ index: iName });
      }
      catch(err){
        console.log('strapi-plugin-opensearch : Error encountered while indexing data to OpenSearch.')
        console.log(err);
        throw err;
      }
    },
    async indexData({itemId, itemData}) {
        const pluginConfig = await strapi.config.get('plugin.opensearch');
        return await this.indexDataToSpecificIndex({itemId, itemData}, pluginConfig.indexAliasName);
    },
    async removeItemFromIndex({itemId}) {
        const pluginConfig = await strapi.config.get('plugin.opensearch');      
        try
        {
          await client.delete({
            index: pluginConfig.indexAliasName,
            id: itemId
          });
          await client.indices.refresh({ index: pluginConfig.indexAliasName });  
        }
        catch(err){
          if (err.meta.statusCode === 404)
            console.error('strapi-plugin-opensearch : The entry to be removed from the index already does not exist.')
          else
          {
            console.error('strapi-plugin-opensearch : Error encountered while removing indexed data from OpenSearch.')
            throw err;
          }
        }    
    },
    async searchData(searchQuery){
      try
      {
          const pluginConfig = await strapi.config.get('plugin.opensearch');
          const result= await client.search({
            index: pluginConfig.indexAliasName,
            ...searchQuery
          });
          return result;
      }
      catch(err)
      {
        console.log('Search : openClient.searchData : Error encountered while making a search request to OpenSearch.')
        throw err;
      }
    }    
});