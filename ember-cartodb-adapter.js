DS.CartoDBAdapter = DS.Adapter.extend({

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
   * Prefix for CartoDB table name
   * @type {String}
   */
  tablePrefix: null,


  /**
   * Turns properties and geometry of GeoJSON object into a collection of
   * column names and values, to be used in a SQL query.
   * @param  {Object} record Ember Object containing the GeoJSON data.
   * @return {Array}         Collection of column (property) names and values.
   */
  sqlColumns: function(record) {
    var columns = [],
        cartoDbSystemColumns = ['cartodb_id','created_at','updated_at'],
        value;

    // add property (attribute) columns
    for (var property in record.get('properties')) {
      // skipping CartoDB system columns
      if (!cartoDbSystemColumns.contains(property)) {
        value = record.get('properties.' + property);
        columns.push({
          name: property,
          value: (typeof value === 'string') ? '\'' + value + '\'' : value
        });
      }
    }

    if (record.get('geometry')) {
      // add geometry column
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

    url = 'http://' + this.accountName + '.cartodb.com/api/v2/sql?q=' + query;
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
        url = this.buildURL(type, queryTpl);

    return $.getJSON(url + '&format=geojson').then(function(featureColl) {
      return featureColl.features.map(function(feature) {
        feature.id = feature.properties.cartodb_id;
        return feature;
      });
    });
  },

  findQuery: function(store, type, query) {
    var where, queryTpl, url;

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

    return $.getJSON(url + '&format=geojson').then(function(featureColl) {
      return featureColl.features.map(function(feature) {
        feature.id = feature.properties.cartodb_id;
        return feature;
      });
    });
  },

  find: function(store, type, id) {
    var queryTpl = 'SELECT * FROM {{table}} WHERE cartodb_id={{id}}',
        url = this.buildURL(type, queryTpl, id);

    return $.getJSON(url + '&format=geojson').then(function(featureColl) {
      var feature;
      if (featureColl.features.length === 0) return { id: id };
      feature = featureColl.features[0];
      feature.id = feature.properties.cartodb_id;
      return feature;
    });
  },


  /**
   * http://emberjs.com/api/data/classes/DS.Adapter.html#method_createRecord
   */
  createRecord: function(store, type, record) {
    var adapter = this,
        sqlColumns = this.sqlColumns(record),
        queryTpl = 'INSERT INTO {{table}} (' + sqlColumns.names + ') VALUES (' + sqlColumns.values + ')',
        url = this.buildURL(type, queryTpl);

    if (!this.apiKey) throw new Error('You tried to create a record but don\'t have a CartoDB API key specified.');

    return $.getJSON(url).then(function(result) {
      // CartoDB only returns meta data
      if (result.total_rows === 1) {
        // Get the last inserted record and cross fingers that it is the same object
        var queryTpl = 'SELECT * FROM {{table}} ORDER BY created_at DESC LIMIT 1',
            url = adapter.buildURL(type, queryTpl);
        return $.getJSON(url + '&format=geojson').then(function(featureColl) {
          var feature;
          if (featureColl.features.length === 1) {
            feature = featureColl.features[0];
            feature.id = feature.properties.cartodb_id;
            return feature;
          }
        });
      }
    });
  },


  /**
   * http://emberjs.com/api/data/classes/DS.Adapter.html#method_updateRecord
   */
  updateRecord: function(store, type, record) {
    var adapter = this,
        sqlColumns = this.sqlColumns(record),
        queryTpl = 'UPDATE {{table}} SET (' + sqlColumns.names +') = (' + sqlColumns.values + ') WHERE cartodb_id={{id}}',
        url = this.buildURL(type, queryTpl, record.get('id'));

    if (!this.apiKey) throw new Error('Error: You tried to update a record but don\'t have a CartoDB API key specified.');

    return $.getJSON(url).then(function(result) {
      // CartoDB only returns meta data
      if (result.total_rows === 1) {
        var queryTpl = 'SELECT * FROM {{table}} WHERE cartodb_id={{id}}',
            url = adapter.buildURL(type, queryTpl, record.get('id'));
        return $.getJSON(url + '&format=geojson').then(function(featureColl) {
          var feature;
          if (featureColl.features.length === 1) {
            feature = featureColl.features[0];
            feature.id = feature.properties.cartodb_id;
            return feature;
          }
        });
      }
    });
  },


  /**
   * http://emberjs.com/api/data/classes/DS.Adapter.html#method_deleteRecord
   */
  deleteRecord: function(store, type, record) {
    var queryTpl = 'DELETE FROM {{table}} WHERE cartodb_id={{id}}',
        url = this.buildURL(type, queryTpl, record.get('id'));

    if (!this.apiKey) throw new Error('Error: You tried to delete a record but don\'t have a CartoDB API key specified.');

    return $.getJSON(url).then(function(result) {
      if (result.total_rows === 1) {
        // faking a valid server response
        return {id: record.get('id')};
      }
    });
  }

});
