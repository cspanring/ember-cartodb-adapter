App = Ember.Application.create();


App.Router.map(function() {
  this.resource('playgrounds');
  this.resource('playground', { path: 'playgrounds/:playground_id' });
});


App.ApplicationAdapter = DS.CartoDBAdapter.extend({
  accountName: 'cspanring',
  apiKey: null
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
    };
  }.property('type', 'geometry', 'properties')
});


App.PlaygroundsRoute = Ember.Route.extend({
  model: function() {
    return this.store.find('playground');
  }
});


App.PlaygroundController = Ember.ObjectController.extend({
  actions: {
    create: function() {
      var record = this.store.createRecord('playground', {
        properties: {
          name: 'create test'
        }
      });
      record.save().then(function(){
        console.log('create test');
      });
    },
    update: function() {
      this.set('properties.name', 'update test');
      this.get('model').save().then(function() {
        console.log('update test');
      });
    },
    delete: function() {
      this.get('model').deleteRecord();
      this.get('model').save().then(function() {
        console.log('delete test');
      });
    },
    destroy: function() {
      this.get('model').destroyRecord().then(function() {
        console.log('destroy test');
      });
    }
  }
});
