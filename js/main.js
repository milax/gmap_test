var app = angular.module('as3App', []);

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

app.controller('gmapController', function($scope, $q, $debounce) {

  var map, gmaps,
    geocoder, searchBox;

  var active_marker, prev_active_marker;
  var markers = [], marker_index = 0;

  var mapOptions = {
      disableDoubleClickZoom: true,
      center: {
        lat: 50.05,
        lng: 36.23,
      },
      zoom: 6
  };

  // center types
  var center_types = [{
      name: 'Sprogcenter',
      marker_url: 'img/marker-pink.png',
      active_marker_url: 'img/marker-pink-active.png'
    }, {
      name: 'Undervisningscenter',
      marker_url: 'img/marker-cyan.png',
      active_marker_url: 'img/marker-cyan-active.png'
    }, {
      name: 'Kontor',
      marker_url: 'img/marker-green.png',
      active_marker_url: 'img/marker-green-active.png'
    }];

  // active center type by default
  var ACTIVE_CENTER_TYPE_INDEX = 0;

  $scope.center_types = center_types;

  $scope.active_center_type_index    = ACTIVE_CENTER_TYPE_INDEX;
  $scope.active_center_type          = center_types[ACTIVE_CENTER_TYPE_INDEX];
  
  $scope.filter_selected_center_type_index  = ACTIVE_CENTER_TYPE_INDEX;
  $scope.filter_selected_center_type        = center_types[ACTIVE_CENTER_TYPE_INDEX];
  $scope.is_filter_enabled = false;
  $scope.filtered_markers_number = 0;

  $scope.total_markers_number = 0;


  $scope.lat     = '';
  $scope.lng     = '';
  $scope.address = '';

  var info_panel = {
    updateWithCoords: function(coords) {
      $scope.lat = coords.lat;
      $scope.lng = coords.lng;
      $scope.$apply();
    },
    clearData: function() {
      $scope.address = '';
      $scope.lat     = '';
      $scope.lng     = '';
    }
  };

  /**
  * Add new marker by click on the map
  */
  var addNewMarkerByClick = function(e) {
    addNewMarker({
      lat: e.latLng.k,
      lng: e.latLng.D
    });
  };

  /**
  * Add new marker with coords
  */
  var addNewMarker = function(coords) {
    if($scope.is_filter_enabled && ($scope.active_center_type.name !== $scope.filter_selected_center_type.name)) {
      alert('Please reset filter to add new center to the map!');
      return;
    }

    var marker = new gmaps.Marker({
        map: map,
        position: coords,
        icon: $scope.active_center_type.marker_url,
        draggable: true
    });

    gmaps.event.addListener(marker, "dragend", function(e) {
      setMarkerActive(marker);
      updateInfoPanel(coords);
      getAddress();
    });

    gmaps.event.addListener(marker, "click", function(e) {
      setMarkerActive(marker);
    });

    gmaps.event.addListener(marker, "dblclick", function (e) {
       return false;
    });

    marker.center_type = $scope.active_center_type;
    marker.marker_index = marker_index;
    marker_index++;
    markers.push(marker);

    setMarkerActive(marker);

    info_panel.updateWithCoords({
      lat: coords.lat,
      lng: coords.lng
    });

    getAddress();
    setTotalMarkersNumber();
  };

  /**
  * Set the marker active
  */
  var setMarkerActive = function(marker) {
    if(active_marker) {
      active_marker.setIcon(active_marker.center_type.marker_url);
    }
    active_marker = marker;
    active_marker.setIcon(active_marker.center_type.active_marker_url);

    getAddress();
    info_panel.updateWithCoords({
      lat: active_marker.position.k,
      lng: active_marker.position.D
    });
    updateContactDetails();
    updateCenterType();
  };

  var updateContactDetails = function() {
    $scope.contact_details = active_marker.contact_details;
  };

  /**
  * Update center type
  */
  var updateCenterType = function() {
    $scope.active_center_type = active_marker.center_type;
    $scope.$apply();
  };

  /**
  * Address input has been changed
  */
  var placesChanged = function(e) {
    var places = searchBox.getPlaces(),
      place;

    if(!places.length) {
      return;
    }

    place = places[0];

    addNewMarker({
      lat: place.geometry.location.k,
      lng: place.geometry.location.D
    });

    map.setCenter(place.geometry.location);
    map.setZoom(14);
  };

  /**
  * Get address for active marker
  */
  var getAddress = function () {
    var address = "";

    if(!active_marker) {
      return;
    }

    geocoder.geocode({
      location: active_marker.getPosition()
    }, function (result, status) {
      if (status == gmaps.GeocoderStatus.OK) {
        address = result[0].formatted_address;
        $scope.address = address;
        $scope.$apply();
      }
    });
  };

  /**
  * init map
  */
  var init = function() {
    var input;

    gmaps    = google.maps;
    map      = new gmaps.Map(document.getElementById('map'), mapOptions);
    geocoder = new gmaps.Geocoder();

    address_input = document.getElementById('search-address');
    searchBox     = new gmaps.places.SearchBox(address_input);

    // attach events
    gmaps.event.addListener(map, "click", addNewMarkerByClick);
    gmaps.event.addListener(searchBox, 'places_changed', placesChanged);
  };

  /**
  * Set defult zoom
  */
  $scope.setDefaultZoom = function() {
    map.setZoom(mapOptions.zoom);
  };

  /**
  * Remove all markers from the map
  */
  $scope.removeAllMarkers = function() {
    for(var i = 0, len = markers.length; i < len; ++i) {
      markers[i].setMap(null);
    }
    info_panel.clearData();
    markers = [];
    setTotalMarkersNumber();
    return false;
  };

  /**
  * Show active marker in the center of map
  */
  $scope.showActiveMarkerInMapCenter = function() {
    map.setCenter({
      lat: active_marker.position.k,
      lng: active_marker.position.D
    });
    map.setZoom(14);
  };

  $scope.setFilter = function() {
    var hidden_markers = 0;

    $scope.filter_selected_center_type = center_types[$scope.filter_selected_center_type_index];

    for(var i in markers) {
      if(markers[i].center_type.name === $scope.filter_selected_center_type.name) {
        markers[i].setVisible(true);
      }
      else {
        hidden_markers++;
        markers[i].setVisible(false);
      }
    }

    if(hidden_markers) {
      $scope.filtered_markers_number = $scope.total_markers_number - hidden_markers;
      $scope.is_filter_enabled = true;
    }
    else {
      $scope.filtered_markers_number = 0;
      $scope.is_filter_enabled = false;
    }
    
  };

  $scope.resetFilter = function() {
    for(var i in markers) {
      markers[i].setVisible(true);
    }
    $scope.filtered_markers_number = 0;
    $scope.is_filter_enabled = false;
  };

  /**
  * Remove active marker from the map
  */
  $scope.removeActiveMarker = function() {
    for(var i = 0, len = markers.length; i < len; ++i) {
      if(markers[i].marker_index === active_marker.marker_index) {
        active_marker.setMap(null);
        markers.splice(i, 1);
        info_panel.clearData();
        break;
      }
    }
    setTotalMarkersNumber();
    return false;
  };

  /**
  * Set total markers number
  */
  var setTotalMarkersNumber = function() {
    $scope.total_markers_number = markers.length;
  };

  var applyContactDetails = function() {
    if(active_marker) {
      active_marker.contact_details = $scope.contact_details;
    }
  };

  /**
  * Center type has been selected in selector
  */
  $scope.centerTypeSelected = function() {
    $scope.active_center_type = center_types[$scope.active_center_type_index];
    if(active_marker) {
      active_marker.center_type = $scope.active_center_type;
      active_marker.setIcon(active_marker.center_type.active_marker_url);
    }
  };

  $scope.$watch('contact_details', function(newValue, oldValue) {
    if (newValue === oldValue) {
      return;
    }
    $debounce(applyContactDetails, 500);
  });

  /*
  * ng-repeat of element has finished its work
  */
  $scope.$on('ngRepeatFinished', function(ngRepeatFinishedEvent, element) {
    var $select = $(element).parent();
    $select.select2({
      templateResult: formatOption,
      minimumResultsForSearch: 100
    });

    function formatOption (opt) {
      var option;

      if(!opt.id) {
        return '';
      }
      option = '<span style="white-space: nowrap"><img src="' + center_types[opt.element.value].marker_url + '" />' + opt.text + '</span>';
      return option;
    }
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