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
        address: ''
      },
      zoom: 6
  };

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

  var ACTIVE_CENTER_TYPE_INDEX = 0;

  $scope.center_types                = center_types;
  $scope.number_of_centers           = 1;
  $scope.selected_center_type        = ACTIVE_CENTER_TYPE_INDEX;
  $scope.active_center_type          = center_types[ACTIVE_CENTER_TYPE_INDEX];
  $scope.filter_selected_center_type = ACTIVE_CENTER_TYPE_INDEX;
  $scope.filter_center_type          = center_types[ACTIVE_CENTER_TYPE_INDEX];

  $scope.lat = '';
  $scope.lng = '';

  var addMarker = function(e) {
    var marker = new gmaps.Marker({
        map: map,
        position: e.latLng,
        icon: $scope.active_center_type.marker_url,
        draggable: true
    });

    gmaps.event.addListener(marker, "dragend", function(e) {
      setThisMarkerActive(marker);
      setMarkerNewPos(e.latLng);
      getAddress();
    });

    gmaps.event.addListener(marker, "click", function(e) {
      setThisMarkerActive(marker);
    });

    gmaps.event.addListener(marker, "dblclick", function (e) {
       return false;
    });

    marker.center_type = $scope.active_center_type;
    marker.marker_index = marker_index;
    marker_index++;
    markers.push(marker);

    setThisMarkerActive(marker);

    $scope.lat = e.latLng.k;
    $scope.lng = e.latLng.D;
    $scope.$apply();
    getAddress();
  };

  var setThisMarkerActive = function(marker) {
    if(active_marker) {
      active_marker.setIcon(active_marker.center_type.marker_url);
    }
    active_marker = marker;
    active_marker.setIcon(active_marker.center_type.active_marker_url);

    getAddress();
    updateCoordsWithActiveMarker();
    updateCenterType();
  };

  var setMarkerNewPos = function(location) {
    $scope.lat = location.k;
    $scope.lng = location.D;
    $scope.$apply();
  };

  var updateCoordsWithActiveMarker = function() {
    $scope.lat = active_marker.position.k;
    $scope.lng = active_marker.position.D;
    $scope.$apply();
  };

  var updateCenterType = function() {
    $scope.active_center_type = active_marker.center_type;
    $scope.$apply();
  };

  var placesChanged = function() {
    var places = searchBox.getPlaces(), place;

    if(!places.length) {
      return;
    }

    place = places[0];

    map.setCenter(place.geometry.location);
    map.setZoom(14);

    // $scope.lat = place.geometry.location.k;
    // $scope.lng = place.geometry.location.D;
    // $scope.$apply();
    // getAddress();
  };

  var getAddress = function () {
    if(!active_marker) {
      return;
    }
    geocoder.geocode({
      location: active_marker.getPosition()
    }, function (result, status) {
      var address = "";

      if (status == gmaps.GeocoderStatus.OK) {
        address = result[0].formatted_address;
        $scope.address = address;

        $scope.$apply();
      }
    });
  };

  var clearMarkerDataInPanel = function() {
    $scope.address = '';
    $scope.lat = '';
    $scope.lng = '';
  };

  var init = function() {
    gmaps = google.maps;
    map = new gmaps.Map(document.getElementById('map'), mapOptions);
    geocoder = new gmaps.Geocoder();

    var input = document.getElementById('search-val');
    searchBox = new gmaps.places.SearchBox(input);

    gmaps.event.addListener(map, "click", addMarker);
    gmaps.event.addListener(searchBox, 'places_changed', placesChanged);

    getAddress();

  };

  $scope.removeAllCenters = function() {
    for(var i = 0, len = markers.length; i < len; ++i) {
      markers[i].setMap(null);
    }
    clearMarkerDataInPanel();
    markers = [];
    return false;
  };

  $scope.removeCurrentCenter = function() {
    for(var i = 0, len = markers.length; i < len; ++i) {
      if(markers[i].marker_index === active_marker.marker_index) {
        active_marker.setMap(null);
        markers.splice(i, 1);
        clearMarkerDataInPanel();
        break;
      }
    }
    return false;
  };

  $scope.isAnyMarker = function() {
    return markers.length;
  };

  $scope.filterTypeSelected = function() {
    $scope.filter_center_type = center_types[$scope.filter_selected_center_type];
  };

  $scope.typeSelected = function() {
    $scope.active_center_type = center_types[$scope.selected_center_type];
    active_marker.center_type = $scope.active_center_type;
    active_marker.setIcon(active_marker.center_type.active_marker_url);
  };

  $scope.$on('ngRepeatFinished', function(ngRepeatFinishedEvent, element) {
    function formatOption (opt) {
      if(!opt.id) {
        return '';
      }
      var option = ('<span style="white-space: nowrap"><img src="' + center_types[opt.element.value].marker_url + '" />' + opt.text + '</span>');
      return option;
    }

    $(element).parent().select2({
      templateResult: formatOption,
      minimumResultsForSearch: 100
    });
  });

  google.maps.event.addDomListener(window, 'load', init);

});

