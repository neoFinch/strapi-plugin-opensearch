'use strict';

module.exports = ({ strapi }) => {
    const helperService = strapi.plugins['opensearch'].services.helper;
    console.log("helperService : ", helperService);
    const getOpensearchInfo = async (ctx) => {
        return helperService.getOpensearchInfo();
    }

    return {
        getOpensearchInfo,
    };     
}