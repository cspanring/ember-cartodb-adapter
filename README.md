# Ember CartoDB Adapter

This is a [CartoDB][1] adapter for [Ember Data][2] 1.0 beta 6, that extends the built-in default data adapter. Please note that Ember Data and this CartoDB adapter are both works in progress, use with caution.

## Download

* [ember-cartodb-adapter.js][3] (5.5 kB)


## Usage

    App.ApplicationAdapter = DS.CartoDBAdapter.extend({
        accountName: '<CartDB Account Name>',
        tablePrefix: '<Tableprefix>',
        // DANGERZONE: GIVES WRITE ACCESS TO YOUR CARTODB ACCOUNT. DON'T USE IT ON PUBLIC SITES!
        apiKey: '<CartoDB API Key>'
    });

View a [simple example][4].


## Issues

* CartoDB table names must correspond to the plural version of your Ember Data Model names. E.g. The adapter will look for the table `playgrounds` to find data about a model called `Playground`.
* Currently only GeoJSON Points (WGS84) are supported. The adapter is more a proof-of-concept.
* All data found in a CartoDB table is stored in the `properties` property of your Ember Data Model.
* `BelongsTo` and `Many` relations are not (yet) supported.


[1]: http://cartodb.com/
[2]: http://github.com/emberjs/data
[3]: http://raw.github.com/cspanring/ember-cartodb-adapter/master/ember-cartodb-adapter.js
[4]: http://cspanring.github.io/ember-cartodb-adapter/
