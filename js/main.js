var app = angular.module('as3App', []);



app.controller('gmapController', function($scope, $q, $debounce) {

  var
    gmap,
    map,
    geocoder;

  var center_types = {
    colors: {
      legend: [
        'blue',       // 0
        'yellow',     // 1
        'light-blue', // 2
        'cyan',       // 3
        'green',      // 4
        'red',        // 5
        'grey'        // 6
      ],
      added: [ 0, 2, 4 ],
      to_add: [ 1, 3, 5, 6 ]
    },

    added: [{
        name: 'Sprogcenter',
        color: 0
      }, {
        name: 'Undervisningscenter',
        color: 2
      }, {
        name: 'Kontor',
        color: 4
      }]
  };

  var IMG_PATH = 'img/';

  var mapOpts = {
    disableDoubleClickZoom: true,
    center: {
      lat: 50.05,
      lng: 36.23,
    },
    zoom: 6
  };

  /**
  * init map
  */
  var init = function() {
    $scope.cts_added = center_types.added;
    $scope.active_ct_index = 0;

    $scope.cts_colors_to_add = center_types.colors.to_add;
    console.log($scope.cts_colors_to_add)
    $scope.active_ct_color_to_add_index = 0;

    $scope.$apply();

    gmaps    = google.maps;
    map      = new gmaps.Map(document.getElementById('map'), mapOpts);

    // attach events
    // gmaps.event.addListener(map, "click", addNewMarkerByClick);
    // gmaps.event.addListener(searchBox, 'places_changed', placesChanged);

    // setCenterTypesToAdd();
  };

  $scope.addCenterType = function() {
    $scope.is_add_center_type_panale_open = true;
  };

  $scope.removeActiveCenterType = function() {
    $scope.cts_added.splice($scope.active_ct_index, 1);
    $scope.active_ct_index = 0;
    reinitCustomSelect($('#active-center-type'));

    return false;
  };

  var reinitCustomSelect = function($select) {
    $select.select2("destroy");
    setTimeout(function(){
      initCustomSelect($select);
    }, 0);
  }

  var initCustomSelect = function($select) {
    $select.select2({
      templateResult: formatOption,
      minimumResultsForSearch: 100,
      templateSelection: formatOption
    });

    function formatOption (opt) {
      var option;

      if(!opt.id) {
        return '';
      }

      var ct_colors_legend = center_types.colors.legend,
        index;

      if($select.hasClass('gmap__add-new-type-selector')) {
        index = $scope.cts_colors_to_add[opt.id];
      }
      else {
        index = $scope.cts_added[opt.id].color;
      }

      option = '<span style="white-space: nowrap"><img src="../' + IMG_PATH; 
      option += ct_colors_legend[index];
      option += '-small.png" />' + opt.text + '</span>';

      return option;
    }
  };

  /*
  * ng-repeat of element has finished its work
  */
  $scope.$on('ngRepeatFinished', function(ngRepeatFinishedEvent, element) {
    var $select = $(element).parent();
    initCustomSelect($select);
  });

  /**
  * Run `init` function on window load event
  */
  google.maps.event.addDomListener(window, 'load', init);

});

app.factory('$debounce', ['$rootScope', '$browser', '$q', '$exceptionHandler',

  function($rootScope, $browser, $q, $exceptionHandler) {
      var deferreds = {},
          methods = {},
          uuid = 0;

      function debounce(fn, delay, invokeApply) {
          var deferred = $q.defer(),
              promise = deferred.promise,
              skipApply = (angular.isDefined(invokeApply) && !invokeApply),
              timeoutId, cleanup,
              methodId, bouncing = false;

          // check we dont have this method already registered
          angular.forEach(methods, function(value, key) {
              if(angular.equals(methods[key].fn, fn)) {
                  bouncing = true;
                  methodId = key;
              }
          });

          // not bouncing, then register new instance
          if(!bouncing) {
              methodId = uuid++;
              methods[methodId] = {fn: fn};
          } else {
              // clear the old timeout
              deferreds[methods[methodId].timeoutId].reject('bounced');
              $browser.defer.cancel(methods[methodId].timeoutId);
          }

          var debounced = function() {
              // actually executing? clean method bank
              delete methods[methodId];

              try {
                  deferred.resolve(fn());
              } catch(e) {
                  deferred.reject(e);
                  $exceptionHandler(e);
              }

              if (!skipApply) {
                  $rootScope.$apply();
              }
          };

          timeoutId = $browser.defer(debounced, delay);

          // track id with method
          methods[methodId].timeoutId = timeoutId;

          cleanup = function() {
              delete deferreds[promise.$$timeoutId];
          };

          promise.$$timeoutId = timeoutId;
          deferreds[timeoutId] = deferred;
          promise.then(cleanup, cleanup);

          return promise;
      }


      // similar to angular's $timeout cancel
      debounce.cancel = function(promise) {
          if (promise && promise.$$timeoutId in deferreds) {
              deferreds[promise.$$timeoutId].reject('canceled');
              return $browser.defer.cancel(promise.$$timeoutId);
          }
          return false;
      };

      return debounce;
  }]);


app.directive('onFinishRender', function ($timeout) {
  return {
    restrict: 'A',
    link: function (scope, element, attr) {
      if (scope.$last === true) {
        $timeout(function () {
          scope.$emit('ngRepeatFinished', element);
        });
      }
    }
  };
});