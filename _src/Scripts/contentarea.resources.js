angular.module("umbraco.resources").factory("contentAreaResource", ["$http", function ($http) {
    var apiUrl = "/umbraco/backoffice/contentarea/contentarea/";

    return {
        getPanelTypes: function () {
            return $http.get(apiUrl + "getPanelTypes");
        }
    };
}]);

angular.module("umbraco.resources").factory("googleMapsResource", ["$q", function ($q) {
    var options = {
        v: '3.17',
        libraries: 'places',
        language: 'en',
        sensor: 'false'
    };
    var scriptId = void 0;

    var googleMapsDefined = function () {
        return angular.isDefined(window.google)
            && angular.isDefined(window.google.maps);
    };

    var getScriptUrl = function () {
        var query = _.map(options, function (v, k) {
            return k + '=' + v;
        });
        query = query.join('&');

        return "https://maps.googleapis.com/maps/api/js?" + query;
    };

    var startGoogleMapsLoading = function (deferred) {
        var callbackFunctionName = options.callback = _.uniqueId('onGoogleMapsLoaded');
        window[callbackFunctionName] = function () {
            deferred.resolve(window.google.maps);

            delete window[callbackFunctionName];
        };

        var document = window.document;
        if (scriptId) {
            document.getElementById(scriptId).remove();
        }

        scriptId = _.uniqueId("google_maps_load");

        var script = document.createElement('script');
        script.id = scriptId;
        script.type = "text/javascript";
        script.src = getScriptUrl();

        document.body.appendChild(script);
    };

    var getGoogleMaps = function () {
        var deferred = $q.defer();

        if (googleMapsDefined()) {
            deferred.resolve(window.google.maps);

            return deferred.promise;
        }

        startGoogleMapsLoading(deferred);

        return deferred.promise;
    };

    return {
        getGoogleMaps: getGoogleMaps
    };
}]);