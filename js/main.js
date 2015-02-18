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

app.controller('gmapController', function($scope, $q) {

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

  $scope.center_types                = center_types;
  $scope.number_of_centers           = 0;

  $scope.active_center_type_index    = ACTIVE_CENTER_TYPE_INDEX;
  $scope.active_center_type          = center_types[ACTIVE_CENTER_TYPE_INDEX];
  // $scope.filter_selected_center_type = ACTIVE_CENTER_TYPE_INDEX;
  // $scope.filter_center_type          = center_types[ACTIVE_CENTER_TYPE_INDEX];

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

    address_input = document.getElementById('search-val');
    searchBox     = new gmaps.places.SearchBox(address_input);

    // attach events
    gmaps.event.addListener(map, "click", addNewMarkerByClick);
    gmaps.event.addListener(searchBox, 'places_changed', placesChanged);
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
    return false;
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
    return false;
  };

  /**
  * Is any marker exists?
  */
  $scope.isAnyMarkerExists = function() {
    return markers.length;
  };

  // $scope.filterTypeSelected = function() {
  //   $scope.filter_center_type = center_types[$scope.filter_selected_center_type];
  // };

  /**
  * Center type has been selected in selector
  */
  $scope.centerTypeSelected = function() {
    $scope.active_center_type = center_types[$scope.active_center_type_index];
    active_marker.center_type = $scope.active_center_type;
    active_marker.setIcon(active_marker.center_type.active_marker_url);
  };

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

