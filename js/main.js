var app = angular.module('as3App', []);


app.controller('gmapController', function($scope) {

  var gmaps,
    map,
    geocoder,
    infoWindow;

  var mapOptions = {
      disableDoubleClickZoom: true,
      center: {
        lat: 50.05,
        lng: 36.23,
        address: ''
      },
      zoom: 6
  };

  var init = function() {
    map = new google.maps.Map(document.getElementById('map'), mapOptions);

    var marker = new google.maps.Marker({
        map: map,
        position: mapOptions.center,
        draggable: true
    });

    google.maps.event.addListener(map, "click", function (e) {
        marker.setPosition(e.latLng);
        $scope.lat = e.latLng.k;
        $scope.lng = e.latLng.D;
        $scope.$apply();
    });

    $scope.lat = mapOptions.center.lat;
    $scope.lng = mapOptions.center.lng;
    $scope.$apply();

  };

  google.maps.event.addDomListener(window, 'load', init);

});
