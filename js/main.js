var app = angular.module('as3App', []);



app.controller('gmapController', function($scope, $q, $debounce) {

  var
    gmap,
    map,
    geocoder,
    markers = [],
    active_marker,
    marker_id = 0, active_marker_id = 0, marker_ids = [],
    searchBox,
    place_coords;

  // var center_types = {
  //   colors: {
  //     legend: [
  //       'blue',       // 0
  //       'yellow',     // 1
  //       'light-blue', // 2
  //       'cyan',       // 3
  //       'green',      // 4
  //       'red',        // 5
  //       'grey'        // 6
  //     ],
  //     to_add: [ 1, 3, 5, 6 ]
  //   },

  //   added: [{
  //       name: 'Sprogcenter',
  //       color: 0
  //     }, {
  //       name: 'Undervisningscenter',
  //       color: 2
  //     }, {
  //       name: 'Kontor',
  //       color: 4
  //     }]
  // };
  var center_types = {};

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

    $.getJSON('http://private-0f369-centers1.apiary-mock.com/getCenters', function(res){
      gmaps    = google.maps;
      map      = new gmaps.Map(document.getElementById('map'), mapOpts);
      geocoder = new gmaps.Geocoder();

      center_types = res[0].center_types;

      $scope.cts_added = center_types.added;
      $scope.cts_colors_to_add = center_types.colors.to_add;
      $scope.addresses = [];
      $scope.$apply();


      var search_address_input = document.getElementById('search-address');
      searchBox     = new gmaps.places.SearchBox(search_address_input);

      // attach events
      gmaps.event.addListener(map, "click", addNewMarkerByClick);
      gmaps.event.addListener(searchBox, 'places_changed', placesChanged);
      $('#active-center-type').change(updateCenterTypeForMarker);

      renderMarkersOnInit(res[0].markers);
    });
  };

  var renderMarkersOnInit = function(ms) {

    var fullBounds = new gmaps.LatLngBounds();

    for(var i in ms) {
      addNewMarker({
        lat: ms[i].coords.lat,
        lng: ms[i].coords.lng
      }, ms[i].center_type);

      fullBounds.extend(new gmaps.LatLng(ms[i].coords.lat, ms[i].coords.lng));
    }

    map.fitBounds(fullBounds);

  };

  var info_panel = {
    updateAllFields: function() {
      var coords = {
        lat: active_marker.position.k,
        lng: active_marker.position.D
      };
      $scope.lat = coords.lat;
      $scope.lng = coords.lng;
      
      $scope.contact_details = active_marker.contact_details;
      $scope.opening_hours = active_marker.opening_hours;
      $scope.phones = active_marker.phones;

      info_panel.updateAddress();
    },
    updateWithCoords: function(coords) {
      $scope.lat = coords.lat;
      $scope.lng = coords.lng;
      // $scope.$apply();
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
          updateAddressArray(address);
          $scope.address = address;
          $scope.$apply();
        }
        else {
          $scope.address = 'Fow now it\'s impossible to get an address...';
        }
      });
    }
  };

  $scope.saveChanges = function() {
    var i, markers_to_send = [], curr_marker, data_to_send = {};
    console.log(markers);
    for(i in markers) {
      curr_marker = markers[i];
      markers_to_send.push({
        coords: {
          lng: curr_marker.position.D,
          lat: curr_marker.position.k
        },
        center_type: curr_marker.center_type,
        phones: curr_marker.phones || '',
        address: curr_marker.address || '',
        opening_hours: curr_marker.opening_hours || '',
        contact_details: curr_marker.contact_details || ''
      });
    }
    data_to_send.markers = markers_to_send;
    data_to_send.center_types = center_types;
    // format array to save data
    console.log(JSON.stringify(data_to_send));
  };

  $scope.addCenterByAddress = function() {
    if(place_coords) {
      addNewMarker(place_coords);
    }
    else {
      alert(1);
    }
  };

  $scope.removeThisCenter = function() {
    for(var i = 0, len = markers.length; i < len; ++i) {
      if(markers[i].marker_id === active_marker_id) {
        active_marker.setMap(null);
        markers.splice(i, 1);
        info_panel.clearData();
        break;
      }
    }
    updateAddressArray();
    return false;
  };

  $scope.getCentersNumber = function(){
    return markers.length;
  };

  $scope.goToAddress = function() {
    var address_to_go_index = $('#address-to-go').val();
    for(var i in markers) {
      if(markers[i].marker_id == address_to_go_index) {
        setMarkerActive(markers[i]);
        map.setCenter(markers[i].getPosition());
        break;
      }
    }
  };

  var updateAddressArray = function(address) {
    if(!address) {
      $scope.addresses.splice(active_marker_id, 1);
      marker_ids.splice(active_marker_id, 1);
    }
    else if($.inArray(address, $scope.addresses) === -1) {
      if(!$scope.addresses[active_marker_id]) {
        $scope.addresses[active_marker_id] = {};
      }
      $scope.addresses[active_marker_id].text = address;
      $scope.addresses[active_marker_id].coords = {
        lng: active_marker.position.D,
        lat: active_marker.position.k
      };
      if(!$.inArray(active_marker_id, marker_ids)) {  
        marker_ids.push(active_marker_id);
      }
    }
  };

  /**
  * Address input has been changed
  */
  var placesChanged = function(e) {
    var
      places = searchBox.getPlaces(),
      place;

    if(!places.length) {
      return;
    }

    place = places[0];
    place_coords = {
      lat: place.geometry.location.k,
      lng: place.geometry.location.D
    };

    map.setCenter(place.geometry.location);
    map.setZoom(14);
  };

  /**
  * Add new marker by click on the map
  */
  var addNewMarkerByClick = function(e) {
    if(!$scope.cts_added.length) {
      return;
    }
    addNewMarker({
      lat: e.latLng.k,
      lng: e.latLng.D
    });
  };

  var updateCenterTypeForMarker = function() {
    if(active_marker) {
      active_marker.center_type = $scope.cts_added[$('#active-center-type').val()];
      active_marker.setIcon(getMarkerIconUrlByColorIndex(active_marker.center_type.color, '-active'));
    }
  };

  var getMarkerIconUrlByColorIndex = function(index, postfix) {
    postfix = postfix || '';
    var ct_colors_legend = center_types.colors.legend;
    return IMG_PATH + ct_colors_legend[index] + postfix + '.png';
  };

  /**
  * Add new marker with coords
  */
  var addNewMarker = function(coords, forced_center_type) {
    var marker = new gmaps.Marker({
        map: map,
        position: coords,
        icon: getMarkerIconUrlByColorIndex($scope.cts_added[$('#active-center-type').val()].color),
        draggable: true
    });

    gmaps.event.addListener(marker, "dragend", function(e) {
      setMarkerActive(marker);
      info_panel.updateWithCoords({
        lat: marker.position.k,
        lng: marker.position.D
      });
      info_panel.updateAddress();
    });

    gmaps.event.addListener(marker, "click", function(e) {
      setMarkerActive(marker);
    });

    gmaps.event.addListener(marker, "dblclick", function (e) {
       return false;
    });

    if(forced_center_type) {
      marker.center_type = forced_center_type;
    }
    else {
      marker.center_type = $scope.cts_added[$('#active-center-type').val()];
    }
    marker.marker_id = marker_id++;
    markers.push(marker);

    setMarkerActive(marker);
  };

  var applyData = function(field) {
    if(active_marker) {
      var data_to_save = '';
      switch(field) {
        case 'phones':
          data_to_save = $scope.phones;
          break;

        case 'opening_hours':
          data_to_save = $scope.opening_hours;
          break;

        case 'contact_details':
          data_to_save = $scope.contact_details;
      }
      active_marker[field] = data_to_save;
    }
  };

  $scope.$watch('contact_details', function(newValue, oldValue) {
    if (newValue === oldValue) {
      return;
    }
    $debounce(function(){
      applyData('contact_details');
    }, 500);
  });

  $scope.$watch('phones', function(newValue, oldValue) {
    if (newValue === oldValue) {
      return;
    }
    $debounce(function(){
      applyData('phones');
    }, 500);
  });

  $scope.$watch('opening_hours', function(newValue, oldValue) {
    if (newValue === oldValue) {
      return;
    }
    $debounce(function(){
      applyData('opening_hours');
    }, 500);
  });


  /**
  * Set the marker active
  */
  var setMarkerActive = function(marker) {
    if(active_marker) {
      active_marker.setIcon(getMarkerIconUrlByColorIndex(active_marker.center_type.color));
    }
    active_marker = marker;
    active_marker.setIcon(getMarkerIconUrlByColorIndex(active_marker.center_type.color, '-active'));
    active_marker_id = active_marker.marker_id;

    // $('#active-center-type option').each(function(i){
    //   if($(this).attr('data-color') == active_marker.center_type.color) {
    //     $('#active-center-type option').val(i);
    //   }
    // })

    info_panel.updateAllFields();
  };

  var removeAllMarkersWithThisType = function(color_index) {
    for(var i = markers.length - 1; i >= 0; i--) {
      var m = markers[i];
      if(m.center_type.color === color_index) {
        $scope.addresses.splice(m.marker_id, 1);
        marker_ids.splice(m.marker_id, 1);

        m.setMap(null);
        markers.splice(i, 1);
      }
    }
    info_panel.clearData();
  };

  $scope.addCenterType = function() {
    if($scope.ct_name_to_add) {
      $scope.cts_added.push({
        color: $scope.cts_colors_to_add[$('.gmap__add-new-type-selector').val()],
        name: $scope.ct_name_to_add
      });
      $scope.cts_colors_to_add.splice($('.gmap__add-new-type-selector').val(), 1);
      reinitCustomSelect($('.gmap__add-new-type-selector'));

      $scope.ct_name_to_add = '';

      if(!$scope.cts_colors_to_add.length) {
        $scope.is_add_center_type_panel_open = false;
      }

      $('#added-new-type-msg').fadeIn(1000, function(){
        $(this).fadeOut();
      });

    }
  };

  $scope.removeActiveCenterType = function() {
    removeAllMarkersWithThisType($scope.cts_added[$('#active-center-type').val()].color);

    $scope.cts_colors_to_add.push($scope.cts_added[$('#active-center-type').val()].color);
    $scope.cts_added.splice($('#active-center-type').val(), 1);

    reinitCustomSelect($('#active-center-type'));

    return false;
  };

  var reinitCustomSelect = function($select) {
    (function($s){
      $s.select2("destroy");
      setTimeout(function(){
        initCustomSelect($s);
      }, 0);
    })($select);
  };


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

      option = '<span style="white-space: nowrap"><img src="' + IMG_PATH;
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