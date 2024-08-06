module.exports = ({ strapi }) => ({
  async recordIndexingPass(message) {
      const entry = await strapi.entityService.create('plugin::opensearch.indexing-log', {
          data : {
              status: 'pass',
              details: message
          }
      });
  },
  async recordIndexingFail(message) {
      const entry = await strapi.entityService.create('plugin::opensearch.indexing-log', {
          data : {
              status: 'fail',
              details: String(message)
          }
      });
  },
  async fetchIndexingLogs(count = 50) {
      const records = await strapi.entityService.findMany('plugin::opensearch.indexing-log', {
          sort: { createdAt: 'DESC' },
          start: 0,
          limit: count
      });
      return records;
  }
});