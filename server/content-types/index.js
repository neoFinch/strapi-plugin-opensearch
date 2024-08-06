'use strict';

const task = require('./opensearch-tasks');
const indexingLog = require('./indexing-logs');

module.exports = {
    'opensearch-task' : {schema : task},
    'indexing-log' : {schema: indexingLog}
};
