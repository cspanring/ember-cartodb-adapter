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

    // add geometry column
    columns.push({
      name: 'the_geom',
      value: 'ST_SetSRID(ST_Point(' + record.get('geometry.coordinates.0') + ', ' + record.get('geometry.coordinates.1') + '),4326)'
    });

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
   * Returns CartoDB SQL API endpoint for provided CartoDB account.
   * @return {String} CartoDB SQL API endpoint
   */
  buildURL: function() {
    if (this.accountName) {
      return 'http://' + this.accountName + '.cartodb.com/api/v2/sql?q=';
    }
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
    var url = this.buildURL(type),
        table = this.buildTableName(type);

    return $.getJSON(url + 'SELECT * FROM ' + table + '&format=geojson').then(function(featureColl) {
      return featureColl.features.map(function(feature) {
        feature.id = feature.properties.cartodb_id;
        return feature;
      });
    });
  },

  find: function(store, type, id) {
    var url = this.buildURL(type),
        table = this.buildTableName(type);

    return $.getJSON(url + 'SELECT * FROM ' + table + ' WHERE cartodb_id=' + id + '&format=geojson').then(function(featureColl) {
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
    var url = this.buildURL(type),
        table = this.buildTableName(type),
        apiKey = this.apiKey,
        sqlColumns = this.sqlColumns(record);

    if (!apiKey) throw 'Error: You tried to create a record but don\'t have a CartoDB API key specified.';

    return $.getJSON(url + 'INSERT INTO ' + table + ' (' + sqlColumns.names + ') VALUES (' + sqlColumns.values + ')&api_key=' + apiKey).then(function(result) {
      // CartoDB only returns meta data
      if (result.total_rows === 1) {
        // Get the last inserted record and cross fingers that it is the same object
        return $.getJSON(url + 'SELECT * FROM ' + table + ' ORDER BY created_at DESC LIMIT 1 &format=geojson').then(function(featureColl) {
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
    var url = this.buildURL(type),
        table = this.buildTableName(type),
        apiKey = this.apiKey,
        sqlColumns = this.sqlColumns(record);

    if (!apiKey) throw 'Error: You tried to update a record but don\'t have a CartoDB API key specified.';

    return $.getJSON(url + 'UPDATE ' + table + ' SET (' + sqlColumns.names +') = (' + sqlColumns.values + ') WHERE cartodb_id=' + record.get('id') + '&api_key=' + apiKey).then(function(result) {
      // CartoDB only returns meta data
      if (result.total_rows === 1) {
        return $.getJSON(url + 'SELECT * FROM ' + table + ' WHERE cartodb_id=' + record.get('id') + '&format=geojson').then(function(featureColl) {
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
    var url = this.buildURL(type),
        table = this.buildTableName(type),
        apiKey = this.apiKey;

    if (!apiKey) throw 'Error: You tried to delete a record but don\'t have a CartoDB API key specified.';

    return $.getJSON(url + 'DELETE FROM ' + table + ' WHERE cartodb_id=' + record.get('id') + '&api_key=' + apiKey).then(function(result) {
      if (result.total_rows === 1) {
        // faking a valid server response
        return {id: record.get('id')};
      }
    });
  }

});
