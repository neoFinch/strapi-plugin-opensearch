const {Client} = require('@opensearch-project/opensearch');
const fs = require('fs');
const path = require('path');


/**
 * @type {Client | null}
 */
let client = null;

let  host = 'localhost';
let  protocol = 'http';
let  port = 9201;
let  auth = 'admin:strongPassword@999'; // For testing only. Don't store credentials in code.
let  ca_certs_path = '/full/path/to/root-ca.pem';

module.exports = ({ strapi }) => ({
    
    async initializeSearchEngine({host, uname, password, cert}){
      console.log('initializeSearchEngine : host :: ', host);
        try {

            auth = uname + ':' + password;
            cert = cert;
            
            console.log("host :: ------------> ", host);
            client = new Client({
                // node: protocol + '://' + auth + '@' + host + ':' + port,
                node: host,
                ssl: {
                    rejectUnauthorized: false
                }
            });
          
        } catch (err) { 
          console.log("err when making connection to opensearch :: ", err);
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
            console.log('strapi-plugin-opensearch : Error while creating index - connection to opensearch refused.')
            console.log(err);
          }
          else
          {
            console.log('strapi-plugin-opensearch : Error while creating index.')
            console.log(err);
          }
        }  
      },
      
      async indexDataToSpecificIndex({itemId, itemData}, iName){
        try
        {
          await client.index({
            index: iName,
            // id: itemId,
            body: itemData
          })
          await client.indices.refresh({ index: iName });
        }
        catch(err){
          console.log('strapi-plugin-opensearch : Error encountered while indexing data to opensearch.')
          console.log(err);
          throw err;
        }
      },

      async indexData({itemId, itemData}) {
          const pluginConfig = await strapi.config.get('plugin.elasticsearch');
          return await this.indexDataToSpecificIndex({itemId, itemData}, pluginConfig.indexAliasName);
      },
      
      async searchData(searchQuery){
        try
        {
            const pluginConfig = await strapi.config.get('plugin.elasticsearch');
            const result= await client.search({
              index: pluginConfig.indexAliasName,
              ...searchQuery
            });
            return result;
        }
        catch(err)
        {
          console.log('Search : elasticClient.searchData : Error encountered while making a search request to ElasticSearch.')
          throw err;
        }
      },
      async checkOSConnection() {
        if (!client)
          return false;
        try {
          // TODO : why connection is not working
          let res = await client.ping();
          console.log("check OPen search Connection :: res :: ", res);
          return true;
        }
        catch(error)
        {
          console.error('strapi-plugin-elasticsearch : Could not connect to Open search.')
          console.error(JSON.stringify(error));
          return false;
        }
        
      },
      async attachAliasToIndex(indexName) {
        try{
            const pluginConfig = await strapi.config.get('plugin.opensearch');
            console.log("attachAliasToIndex ::", {pluginConfig})
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
            console.log('strapi-plugin-opensearch : Attaching alias to the index - Connection to opensearch refused.')
            console.log(err);
          }
          else
          {
            console.log('strapi-plugin-opensearch : Attaching alias to the index - Error while setting up alias within opensearch.')
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
            console.log('strapi-plugin-elasticsearch : Connection to ElasticSearch refused.')
            console.log(err);
          }
          else
          {
            console.log('strapi-plugin-elasticsearch : Error while deleting index to ElasticSearch.')
            console.log(err);
          }    
        }
      },
})