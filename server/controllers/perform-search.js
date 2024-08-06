'use strict';

const qs = require('qs');

module.exports =  {
  search : async (ctx) => {
    try {
        const osInterface = strapi.plugins['opensearch'].services.osInterface;
        if (ctx.query.query)
        {
          const query = qs.parse(ctx.query.query);
          const resp = await osInterface.searchData(query);
          if (resp?.hits?.hits)
          {
            const filteredData = resp.hits.hits.filter(dt => dt._source !== null);
            const filteredMatches = filteredData.map((dt) => dt['_source']);
            ctx.body = filteredMatches;
          }
          else
            ctx.body = {}
        }
        else
          ctx.body = {}
      } catch (err) {
        ctx.response.status = 500;
        ctx.body = "An error was encountered while processing the search request."
        console.log('An error was encountered while processing the search request.')
        console.log(err);
      }
  }  
};
