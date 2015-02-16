angular.module("umbraco").directive("caGeoLocation", ["googleMapsResource", function (googleMapsResource) {
    var searchBox, mapCanvas;

    var controller = function ($scope) {
        var property = $scope.property;

        if (!property.value) {
            property.value = {
                lat: 0,
                lng: 0,
                address: ""
            };
        }

        var gmaps, map, geocoder, infoWindow;
        var stylesArray = [
            {
                "featureType": "water",
                "elementType": "all",
                "stylers": [
                    {
                        "hue": "#e9ebed"
                    }, {
                        "saturation": -78
                    }, {
                        "lightness": 67
                    }, {
                        "visibility": "simplified"
                    }
                ]
            }, {
                "featureType": "landscape",
                "elementType": "all",
                "stylers": [
                    {
                        "hue": "#ffffff"
                    }, {
                        "saturation": -100
                    }, {
                        "lightness": 100
                    }, {
                        "visibility": "simplified"
                    }
                ]
            }, {
                "featureType": "road",
                "elementType": "geometry",
                "stylers": [
                    {
                        "hue": "#bbc0c4"
                    }, {
                        "saturation": -93
                    }, {
                        "lightness": 31
                    }, {
                        "visibility": "simplified"
                    }
                ]
            }, {
                "featureType": "poi",
                "elementType": "all",
                "stylers": [
                    {
                        "hue": "#ffffff"
                    }, {
                        "saturation": -100
                    }, {
                        "lightness": 100
                    }, {
                        "visibility": "off"
                    }
                ]
            }, {
                "featureType": "road.local",
                "elementType": "geometry",
                "stylers": [
                    {
                        "hue": "#e9ebed"
                    }, {
                        "saturation": -90
                    }, {
                        "lightness": -8
                    }, {
                        "visibility": "simplified"
                    }
                ]
            }, {
                "featureType": "transit",
                "elementType": "all",
                "stylers": [
                    {
                        "hue": "#e9ebed"
                    }, {
                        "saturation": 10
                    }, {
                        "lightness": 69
                    }, {
                        "visibility": "on"
                    }
                ]
            }, {
                "featureType": "administrative.locality",
                "elementType": "all",
                "stylers": [
                    {
                        "hue": "#2c2e33"
                    }, {
                        "saturation": 7
                    }, {
                        "lightness": 19
                    }, {
                        "visibility": "on"
                    }
                ]
            }, {
                "featureType": "road",
                "elementType": "labels",
                "stylers": [
                    {
                        "hue": "#bbc0c4"
                    }, {
                        "saturation": -93
                    }, {
                        "lightness": 31
                    }, {
                        "visibility": "on"
                    }
                ]
            }, {
                "featureType": "road.arterial",
                "elementType": "labels",
                "stylers": [
                    {
                        "hue": "#bbc0c4"
                    }, {
                        "saturation": -93
                    }, {
                        "lightness": -2
                    }, {
                        "visibility": "simplified"
                    }
                ]
            }
        ];

        var mapOptions = {
            disableDoubleClickZoom: true,
            center: property.value,
            zoom: 6,
            styles: stylesArray
        };

        var showAddress = function (marker, address) {
            infoWindow.close();
            infoWindow.setContent('');

            if (address) {
                infoWindow.setContent("<div class='address-info'>" + address + "</div>");
                infoWindow.open(map, marker);
            }
        };

        var getAddress = function (location, callback) {
            geocoder.geocode({ location: location }, function (result, status) {
                var address = "";

                if (status == gmaps.GeocoderStatus.OK) {
                    address = result[0].formatted_address;
                }

                callback(address);
            });
        };

        var setupSearch = function () {
            var markers = [];
            var mapSearchBox = new gmaps.places.SearchBox(searchBox);

            gmaps.event.addListener(mapSearchBox, 'places_changed', function () {
                var places = mapSearchBox.getPlaces();
                if (places.length == 0) {
                    return;
                }

                _.forEach(markers, function (marker) {
                    marker.setMap(null);
                });

                markers = [];
                var bounds = new gmaps.LatLngBounds();

                _.forEach(places, function (place) {
                    var icon = {
                        url: place.icon,
                        size: new gmaps.Size(25, 25),
                        scaledSize: new gmaps.Size(25, 25)
                    };

                    var searchMarker = new gmaps.Marker({
                        map: map,
                        icon: icon,
                        title: place.name,
                        position: place.geometry.location
                    });

                    gmaps.event.addListener(searchMarker, 'click', function (e) {
                        getAddress(searchMarker.getPosition(), function (address) {
                            showAddress(searchMarker, address);
                        });
                    });

                    markers.push(searchMarker);
                    bounds.extend(place.geometry.location);
                });

                map.fitBounds(bounds);
            });

            gmaps.event.addListener(map, 'bounds_changed', function () {
                var bounds = map.getBounds();
                mapSearchBox.setBounds(bounds);
            });
        };

        var init = function (maps) {
            gmaps = maps;
            map = new maps.Map(mapCanvas, mapOptions);
            geocoder = new maps.Geocoder();
            infoWindow = new maps.InfoWindow({});

            var marker = new maps.Marker({
                map: map,
                mapTypeId: maps.MapTypeId.ROADMAP,
                position: property.value,
                draggable: true,
            });

            maps.event.addListener(map, "click", function (e) {
                marker.setPosition(e.latLng);
            });

            maps.event.addListener(marker, "click", function (e) {
                showAddress(marker, property.value.address);
            });

            $scope.updateMap = function () {
                map.setCenter($scope.position);
                marker.setPosition($scope.position);
            };

            $scope.position = {
                lat: property.value.lat,
                lng: property.value.lng
            };

            $scope.$watch(function () { return marker.getPosition(); }, function (newValue, oldValue) {
                var lat = newValue.lat();
                var lng = newValue.lng();

                if ($scope.position.lat == lat && $scope.position.lng == lng) {
                    return;
                }

                $scope.position.lat = lat;
                $scope.position.lng = lng;

                getAddress(newValue, function (address) {
                    showAddress(marker, address);

                    property.value.lat = lat;
                    property.value.lng = lng;
                    property.value.address = address;
                });
            });

            setupSearch();
        };

        var watch = $scope.$watch('panel.selected', function (value) {
            if (value) {
                googleMapsResource.getGoogleMaps().then(function (maps) {
                    init(maps);
                });
                watch();
            }
        });
    };

    var linker = function (scope, element, attrs) {
        searchBox = element.find('.search-box')[0];
        mapCanvas = element.find('.map-canvas')[0];
    };

    return {
        restrict: "E",
        controller: controller,
        link: linker,
        scope: false,
        transclude: true,
        template: "<div class='geo-location' ng-transclude></div>"
    }
}]);
