App.rootElement = '#qunit-fixture';
App.setupForTesting();
App.injectTestHelpers();

test('The ApplicationAdapter is defined', function() {
  App.reset();
  ok(App.ApplicationAdapter, 'The ApplicationAdapter is defined');
  ok(DS.CartoDBAdapter.detect(App.ApplicationAdapter), 'The ApplicationAdapter is a subclass of DS.CartoDBAdapter.');
});

// FIXME: 
// Log msg: Assertion Failed: You have turned on testing mode, which disabled the run-loop's autorun. You will need to wrap any code with asynchronous side-effects in an Ember.run

// test('Find all is returning correct results', function(){
//   App.reset();
//   visit('/playgrounds');
//   andThen(function() {
//     equal(find('ul.playgrounds li').length, 4, 'The list should have 4 items.');
//   });
// });

// test('Find one is returning correct result', function(){
//   App.reset();
//   visit('/playgrounds/1');
//   andThen(function() {
//     equal(find('h2').text(), 'Hodgkins Playground', 'The text should be \'Hodgkins Playground\'.');
//   });
// });