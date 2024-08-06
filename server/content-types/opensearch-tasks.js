module.exports = {
  "kind": "collectionType",
  "collectionName": "opensearch-task",
  "info": {
    "singularName": "opensearch-task",
    "pluralName": "opensearch-tasks",
    "displayName": "OpenSearch Task",
    "description": "Search indexing tasks"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
      'content-manager': {
          visible: true,
        },
        'content-type-builder': {
          visible: true,
        }        
  },
  "attributes": {
    "collection_name": {
      "type": "string",
      "required": true
    },
    "item_id": {
      "type": "integer"
    },
    "indexing_status": {
      "type": "enumeration",
      "enum": [
        "to-be-done",
        "done"
      ],
      "required": true,
      "default": "to-be-done"
    },
    "full_site_indexing": {
      "type": "boolean"
    },
    "indexing_type": {
      "type": "enumeration",
      "enum": [
        "add-to-index",
        "remove-from-index"
      ],
      "default": "add-to-index",
      "required": true
    }
  }
}
