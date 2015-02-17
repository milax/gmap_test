var app = angular.module('as3App', []);


app.controller('gmapController', function($scope) {

  var map, gmaps,
    geocoder, searchBox, marker;

  var mapOptions = {
      disableDoubleClickZoom: true,
      center: {
        lat: 50.05,
        lng: 36.23,
        address: ''
      },
      zoom: 6
  };

  var setMarkerPos = function(e) {
      marker.setPosition(e.latLng);
      $scope.lat = e.latLng.k;
      $scope.lng = e.latLng.D;
      $scope.$apply();
      getAddress();
  };

  var placesChanged = function() {
      var places = searchBox.getPlaces(), place;

      if(!places.length) {
        return;
      }

      place = places[0];

      marker.setPosition(place.geometry.location);
      map.setCenter(place.geometry.location);

      $scope.lat = place.geometry.location.k;
      $scope.lng = place.geometry.location.D;
      $scope.$apply();
      getAddress();
  };

  var getAddress = function () {
      geocoder.geocode({ location: marker.getPosition() }, function (result, status) {
          var address = "";

          if (status == gmaps.GeocoderStatus.OK) {
              address = result[0].formatted_address;
              $scope.address = address;
              $scope.$apply();
          }

      });
  };

  var init = function() {
    gmaps = google.maps;
    map = new gmaps.Map(document.getElementById('map'), mapOptions);
    geocoder = new gmaps.Geocoder();

    marker = new gmaps.Marker({
        map: map,
        position: mapOptions.center,
        draggable: true
    });

    var input = document.getElementById('search-val');
    searchBox = new gmaps.places.SearchBox(input);

    gmaps.event.addListener(map, "click", setMarkerPos);
    gmaps.event.addListener(marker, "dragend", setMarkerPos);
    gmaps.event.addListener(searchBox, 'places_changed', placesChanged);

    $scope.lat = mapOptions.center.lat;
    $scope.lng = mapOptions.center.lng;
    $scope.$apply();

    getAddress();

  };

  google.maps.event.addDomListener(window, 'load', init);

});
