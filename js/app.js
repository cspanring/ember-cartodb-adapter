App = Ember.Application.create();


App.Router.map(function() {
  this.resource('playgrounds', function() {
    this.resource('playground', { path: ':playground_id' });
  });
});


App.ApplicationAdapter = DS.CartoDBAdapter.extend({
  accountName: 'cspanring'
});


App.Playground = DS.Model.extend({
  type: DS.attr('string'),
  properties: DS.attr(),
  geometry: DS.attr(),

  geojson: function() {
    return {
      type: this.get('type'),
      geometry: this.get('geometry'),
      properties: this.get('properties')
    }
  }.property('type', 'geometry', 'properties')
});


App.PlaygroundsRoute = Ember.Route.extend({
  model: function() {
    return this.store.find('playground');
  }
});


App.LeafletMapComponent = Ember.Component.extend({

  feature: null,
  geoJsonLayer: null,

  updateMap: function() {
    var geoJsonLayer = this.get('geoJsonLayer');
    geoJsonLayer.clearLayers();
    geoJsonLayer.addData(this.get('feature.geojson'));
  }.observes('feature'),

  didInsertElement: function() {
    var $map = this.$('#map').get(0),
        map, stamenToner, geoJsonLayer;
        
    map = L.map($map).setView([42.395, -71.12], 14);
    stamenToner = L.tileLayer('http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png', {
      attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
      subdomains: 'abcd',
      minZoom: 0,
      maxZoom: 20
    }).addTo(map);

    geoJsonLayer = L.geoJson().addTo(map);
    geoJsonLayer.addData(this.get('feature.geojson'));

    this.set('geoJsonLayer', geoJsonLayer);
  }
});
