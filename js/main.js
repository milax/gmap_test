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

  var IMG_PATH = 'img/'

  var TOTAL_COLORS = 7;
  var all_center_types_colors = [
    'blue',       // 0
    'yellow',     // 1
    'light-blue', // 2
    'cyan',       // 3
    'green',      // 4
    'red',        // 5
    'grey'        // 6
  ];

  var center_types_to_add = [
  ];

  // center types
  var center_types = [{
      name: 'Sprogcenter',
      color: 0
    }, {
      name: 'Undervisningscenter',
      color: 1
    }, {
      name: 'Kontor',
      color: 2
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
  $scope.is_allowed_changes = true;

  $scope.total_markers_number = 0;
  $scope.center_type_color_to_add = 0;
  $scope.center_types_to_add = center_types_to_add;

  $scope.all_center_types_colors = all_center_types_colors;

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
    },
    updateContactDetails: function() {
      $scope.contact_details = active_marker.contact_details;
    },
    updateAddress: function () {
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
    }
  };

  $scope.removeCurrentCenterType = function() {
    var $select = $('.gmap-module__active-center-type');

    $scope.center_types.splice($scope.active_center_type_index, 1);
    $scope.active_center_type_index = 0;

    reinitSelect($select);

    return false;
  };

  var reinitSelect = function($select) {
    $select.select2("destroy");
    setTimeout(function(){
      initCustomSelect($select);
    }, 0);
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
      info_panel.updateAddress();
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

    info_panel.updateAddress();
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

    info_panel.updateAddress();
    info_panel.updateWithCoords({
      lat: active_marker.position.k,
      lng: active_marker.position.D
    });
    info_panel.updateContactDetails();
    updateCenterType();
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
  * init map
  */
  var init = function() {
    var address_input;

    gmaps    = google.maps;
    map      = new gmaps.Map(document.getElementById('map'), mapOptions);
    geocoder = new gmaps.Geocoder();

    address_input = document.getElementById('search-address');
    searchBox     = new gmaps.places.SearchBox(address_input);

    // attach events
    gmaps.event.addListener(map, "click", addNewMarkerByClick);
    gmaps.event.addListener(searchBox, 'places_changed', placesChanged);

    setCenterTypesToAdd();
  };

  var setCenterTypesToAdd = function() {
    var init_center_types = [];

    center_types_to_add = [];

    for(var i in center_types) {
      init_center_types.push(center_types[i].color);
    }

    init_center_types = arrNoDupe(init_center_types);

    for(var i = 0; i < TOTAL_COLORS; ++i) {
      if($.inArray(i, init_center_types) === -1) {
        center_types_to_add.push(i);
      }
    }

    $scope.center_types_to_add = center_types_to_add;

    function arrNoDupe(a) {
      var temp = {};
      for (var i = 0; i < a.length; i++) {
        temp[a[i]] = true;
      }

      var r = [];
      for (var k in temp) {
        r.push(parseInt(k, 10));
      }

      return r;
    }
  };

  $scope.addNewType = function() {
    if($scope.center_type_name_to_add) {
      center_types.push({
        color: $scope.center_types_to_add[$scope.center_type_color_to_add],
        name: $scope.center_type_name_to_add
      })
      $scope.center_type_name_to_add = '';
      $scope.center_types_to_add.splice($scope.center_type_color_to_add, 1);
      $scope.center_type_color_to_add = 0;
      reinitSelect($('.gmap-module__add-new-type-selector'));
    }
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

    $scope.is_allowed_changes = active_marker.center_type.name !== $scope.filter_selected_center_type.name;
    
  };

  $scope.resetFilter = function() {
    for(var i in markers) {
      markers[i].setVisible(true);
    }
    $scope.filtered_markers_number = 0;
    $scope.is_filter_enabled = false;
    $scope.is_allowed_changes = true;
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

      option = '<span style="white-space: nowrap"><img src="../' + IMG_PATH;
      if($select.hasClass('gmap-module__add-new-type-selector')) {
        option += all_center_types_colors[center_types_to_add[opt.id]];
      }
      else {
        option += all_center_types_colors[center_types[opt.id].color];
      }
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
