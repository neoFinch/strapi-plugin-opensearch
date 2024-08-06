
module.exports = ({ strapi }) => {
  const logIndexingService = strapi.plugins['opensearch'].services.logIndexing;
  const fetchRecentRunsLog = async (ctx) => {
      return await logIndexingService.fetchIndexingLogs();
  }

  return {
      fetchRecentRunsLog
  };
}
