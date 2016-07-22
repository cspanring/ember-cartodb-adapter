DS.CartoDBAdapter = DS.RESTAdapter.extend({

  /**
   * CartoDB account name
   * @type {String}
   */
  accountName: null,


  /**
   * CartoDB API Key
   * DANGERZONE: GIVES WRITE ACCESS TO YOUR CARTODB ACCOUNT.
   *             DON'T USE IT ON PUBLIC SITES!
   * @type {String}
   */
  apiKey: null,


  /**
   * Optional prefix for CartoDB table name
   * @type {String}
   */
  tablePrefix: null,


  /**
   * Serializes properties and geometry of GeoJSON object as a collection of
   * column names and values, to be used in a SQL query.
   * @param  {Object} record Ember Object containing the GeoJSON data.
   * @return {Array}         Collection of column (property) names and values.
   */
  sqlColumns: function(record) {
    var columns = [],
        cartoDbSystemColumns = ['cartodb_id','created_at','updated_at'],
        value;

    for (var property in record.get('properties')) {
      if (!cartoDbSystemColumns.contains(property)) {
        value = record.get('properties.' + property);
        value = (value === null) ? '' : value;
        columns.push({
          name: property,
          value: (typeof value === 'string') ? '\'' + value + '\'' : value
        });
      }
    }

    if (record.get('geometry')) {
      columns.push({
        name: 'the_geom',
        value: 'ST_SetSRID(ST_Point(' + record.get('geometry.coordinates.0') + ', ' + record.get('geometry.coordinates.1') + '),4326)'
      });
    }

    return {
      names: columns.map(function(column) {
        return column.name;
      }).join(','),
      values: columns.map(function(column) {
        return column.value;
      }).join(',')
    };
  },


  /**
   * Serializes a CartoDB response object as GeoJSON feature
   * @param  {Object} row Result row
   * @return {Object}     GeoJSON feature
   */
  serializeResultRow: function(row) {
    var properties = {},
        skipAttr = ['the_geom', 'the_geom_webmercator', 'geometry'];

    for(var key in row) {
      if(row.hasOwnProperty(key)){
        if (!skipAttr.contains(key)) {
          properties[key] = row[key];
        }
      }
    }
    return {
      id: row.cartodb_id || null,
      properties: properties,
      geometry: JSON.parse(row.geometry) || null
    };
  },


  /**
   * Returns CartoDB SQL API endpoint.
   * @param  {Object} type  Subclass of DS.Model
   * @param  {String} query SQL query statement
   * @param  {String} id    Model ID
   * @return {String}       CartoDB SQL API endpoint
   */
  buildURL: function(type, queryTpl, id) {
    var url, query,
        table = this.buildTableName(type);

    if (!this.accountName) throw new Error('Error: No CartoDB Account is specified.');

    query = queryTpl.replace(/{{table}}/g, table);
    if (id) query = query.replace(/{{id}}/g, id);

    url = '//' + this.accountName + '.cartodb.com/api/v2/sql?q=' + query;
    if (this.apiKey) url += '&api_key=' + this.apiKey;
    return url;
  },


  /**
   * Returns CartoDB table name based on type and configured table prefix.
   * @param  {Object} type Subclass of DS.Model
   * @return {String}      Tablename
   */
  buildTableName: function(type) {
    if (this.get('tablePrefix')) {
      return this.get('tablePrefix') + '_' + type.typeKey.pluralize();
    }
    return type.typeKey.pluralize();
  },


  /**
   * http://emberjs.com/api/data/classes/DS.Adapter.html#method_find
   */
  findAll: function(store, type) {
    var queryTpl = 'SELECT * FROM {{table}}',
        url = this.buildURL(type, queryTpl),
        response = {};

    return this.ajax(url + '&format=geojson', 'GET').then(function(featureColl) {
      response[type.typeKey.pluralize()] = featureColl.features.map(function(feature) {
        feature.id = feature.properties.cartodb_id;
        return feature;
      });
      return response;
    });
  },

  findQuery: function(store, type, query) {
    var where, queryTpl, url,
        response = {};

    // serializes query object as 'WHERE' condition
    for (var column in query) {
      if (query.hasOwnProperty(column)) {
        if (where === undefined) where = ' WHERE ';
        where += column + '=\'' + query[column] + '\' AND ';
      }
    }
    where = where.replace(/AND\s+$/, '');

    queryTpl = 'SELECT * FROM {{table}}' + where;
    url = this.buildURL(type, queryTpl);

    return this.ajax(url + '&format=geojson', 'GET').then(function(featureColl) {
      response[type.typeKey.pluralize()] = featureColl.features.map(function(feature) {
        feature.id = feature.properties.cartodb_id;
        return feature;
      });
      return response;
    });
  },

  find: function(store, type, id) {
    var queryTpl = 'SELECT * FROM {{table}} WHERE cartodb_id={{id}}',
        url = this.buildURL(type, queryTpl, id),
        response = {};

    return this.ajax(url + '&format=geojson', 'GET').then(function(featureColl) {
      var feature;
      if (featureColl.features.length === 0) throw new Error('No record found.');
      feature = featureColl.features[0];
      feature.id = feature.properties.cartodb_id;
      response[type.typeKey] = feature;
      return response;
    });
  },


  /**
   * http://emberjs.com/api/data/classes/DS.Adapter.html#method_createRecord
   */
  createRecord: function(store, type, record) {
    var adapter = this,
        sqlColumns = this.sqlColumns(record),
        queryTpl = 'INSERT INTO {{table}} (' + sqlColumns.names + ') VALUES (' + sqlColumns.values + ') RETURNING ST_AsGeoJSON(the_geom) as geometry, *',
        url = this.buildURL(type, queryTpl),
        response= {};

    if (!this.apiKey) throw new Error('You tried to create a record but don\'t have a CartoDB API key specified.');

    return this.ajax(url, 'GET').then(function(result) {
      if (result.total_rows === 1) {
        response[type.typeKey] = adapter.serializeResultRow(result.rows[0]);
        return response;
      }
      throw new Error('Error: Could not create the record.');
    });
  },


  /**
   * http://emberjs.com/api/data/classes/DS.Adapter.html#method_updateRecord
   */
  updateRecord: function(store, type, record) {
    var adapter = this,
        sqlColumns = this.sqlColumns(record),
        queryTpl = 'UPDATE {{table}} SET (' + sqlColumns.names +') = (' + sqlColumns.values + ') WHERE cartodb_id={{id}} RETURNING ST_AsGeoJSON(the_geom) as geometry, *',
        url = this.buildURL(type, queryTpl, record.get('id')),
        response = {};
        
    if (!this.apiKey) throw new Error('Error: You tried to update a record but don\'t have a CartoDB API key specified.');

    return this.ajax(url, 'GET').then(function(result) {
      if (result.total_rows === 1) {
        response[type.typeKey] = adapter.serializeResultRow(result.rows[0]);
        return response;
      }
      throw new Error('Error: Could not update the record.');
    });
  },


  /**
   * http://emberjs.com/api/data/classes/DS.Adapter.html#method_deleteRecord
   */
  deleteRecord: function(store, type, record) {
    var adapter = this,
        queryTpl = 'DELETE FROM {{table}} WHERE cartodb_id={{id}} RETURNING ST_AsGeoJSON(the_geom) as geometry, *',
        url = this.buildURL(type, queryTpl, record.get('id')),
        response = {};

    if (!this.apiKey) throw new Error('Error: You tried to delete a record but don\'t have a CartoDB API key specified.');

    return this.ajax(url, 'GET').then(function(result) {
      if (result.total_rows === 1) {
        response[type.typeKey] = adapter.serializeResultRow(result.rows[0]);
        return response;
      }
      throw new Error('Error: Could not delete the record.');
    });
  }

});
