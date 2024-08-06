'use strict';

module.exports = ({ strapi }) => ({
  index(ctx) {
    ctx.body = strapi
      .plugin('opensearch')
      .service('myService')
      .getWelcomeMessage();
  },
});
