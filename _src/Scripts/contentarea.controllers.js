angular.module("umbraco").controller("ContentArea.EditorController", ["$scope", "contentAreaResource", function ($scope, contentAreaResource) {
    var init = function (panelTypes) {
        var getPanelType = function (id) {
            for (var i = 0; i < panelTypes.length; ++i) {
                if (panelTypes[i].id == id) {
                    return panelTypes[i];
                }
            }

            return null;
        };

        var getSortableOptions = function () {
            var updateTinyMceEditors = function (ui, command, e) {
                if (typeof tinyMCE === "undefined") {
                    return;
                }

                _.forEach($.find("ca-rich-text textarea", e.target), function (rte) {
                    var id = $(rte).attr('id');
                    console.log(id);
                    tinyMCE.execCommand(command, false, id);
                });
            };

            return {
                distance: 10,
                cursor: "move",
                handle: ".panel-tools-move",
                placeholder: "panel__placeholder",
                start: function (e, ui) {
                    updateTinyMceEditors(ui, "mceRemoveEditor", e);
                },
                stop: function (e, ui) {
                    updateTinyMceEditors(ui, "mceAddEditor", e);
                }
            };
        };

        var buildPanelModel = function (panel) {
            var panelType = getPanelType(panel.typeId);
            var panelModel = {
                name: panelType.name,
                editorPath: panelType.editorPath,
                relatedPanel: panel,
                selected: false,
                typeId: panelType.id,
                properties: []
            };

            _.forEach(panelType.properties, function (propertyDefinition) {
                var propertyValue = panel[propertyDefinition.id];
                var property = {
                    id: propertyDefinition.id,
                    name: propertyDefinition.name,
                    value: (propertyValue ? propertyValue : null),
                    editorPath: propertyDefinition.editorPath,
                    metadata: propertyDefinition.metadata
                };

                if (property.value == null && property.metadata.defaultValue) {
                    property.value = property.metadata.defaultValue;
                }

                panelModel.properties.push(property);
            });

            return panelModel;
        };

        if (!$scope.model.value || !angular.isArray($scope.model.value.panels)) {
            $scope.model.value = {
                panels: []
            };
        }

        var panels = [];

        $scope.panels = panels;
        $scope.panelTypes = panelTypes;
        $scope.sortableOptions = getSortableOptions();

        _.forEach($scope.model.value.panels, function (panel) {
            var model = buildPanelModel(panel);

            panels.push(model);
        });

        $scope.togglePanel = function (panel) {
            panel.selected = !panel.selected;
        };

        $scope.addPanel = function (panelType) {
            var panel = { typeId: panelType.id };
            var panelModel = buildPanelModel(panel);
            panelModel.selected = true;

            $scope.model.value.panels.push(panel);
            panels.push(panelModel);
        };

        $scope.removePanel = function ($index) {
            $scope.model.value.panels.splice($index, 1);
            panels.splice($index, 1);
        };

        $scope.applyChanges = function () {
            $scope.$broadcast("ca.applyingChanges");

            var orderedPanels = [];
            _.forEach(panels, function (panelModel) {
                var panel = panelModel.relatedPanel;

                _.forEach(panelModel.properties, function (property) {
                    panel[property.id] = property.value;
                });

                orderedPanels.push(panel);
            });

            $scope.model.value.panels = orderedPanels;
        };

        $scope.$on("formSubmitting", $scope.applyChanges);
    };

    contentAreaResource
        .getPanelTypes()
        .success(init);
}]);

angular.module("umbraco").controller("ContentArea.PropertyEditors.ImageController", ["$scope", "dialogService", function ($scope, dialogService) {
    $scope.setImage = function () {
        dialogService.mediaPicker({
            multiPicker: false,
            callback: function (data) {
                $scope.property.value = {
                    id: data.id,
                    url: data.image,
                    thumbnailUrl: data.thumbnail
                };
            }
        });
    };
}]);

angular.module("umbraco").controller("ContentArea.PropertyEditors.SelectionListController", ["$scope", function ($scope) {
    var property = $scope.property;
    var selectionItems = property.metadata.selectionItems;

    if (!selectionItems) {
        selectionItems = [];
    }

    if (!property.value && selectionItems.length > 0) {
        property.value = selectionItems[0].value;
    }

    $scope.selectionItems = selectionItems;
}]);

angular.module("umbraco").controller("ContentArea.PropertyEditors.ImageListController", ["$scope", "dialogService", function ($scope, dialogService) {
    var property = $scope.property;
    if (!property.value || !property.value.images) {
        property.value = {
            images: []
        };
    }

    $scope.images = property.value.images;
    $scope.selectedImage = null;
    $scope.sortableOptions = {
        distance: 15,
        tolerance: "pointer",
        cursor: "move",
        handle: ".move",
        placeholder: "image__placeholder",
    };

    $scope.addImages = function () {
        dialogService.mediaPicker({
            multiPicker: true,
            callback: function (data) {
                _.forEach(data, function (image) {
                    var model = {
                        id: image.id,
                        url: image.url,
                        thumbnailUrl: image.thumbnail
                    };

                    $scope.images.push(model);
                });
            }
        });
    };

    $scope.updateImage = function (image) {
        dialogService.mediaPicker({
            callback: function (data) {
                image.id = data.id;
                image.url = data.image;
                image.thumbnailUrl = data.thumbnail;
            }
        });
    };

    $scope.removeImage = function ($index) {
        $scope.images.splice($index, 1);
    };

    $scope.selectImage = function (image) {
        $scope.selectedImage = image;
    };

    $scope.unselectImage = function () {
        $scope.selectedImage = null;
    };

    $scope.$on('ca.applyingChanges', function () {
        var images = [];

        _.forEach($scope.images, function (image) {
            if (image.id) {
                images.push(image);
            }
        });

        property.value.images = images;
    });
}]);

angular.module("umbraco").controller("ContentArea.PropertyEditors.IngredientListController", ["$scope", function ($scope) {
    var property = $scope.property;
    property.value = property.value || { groups: [] };

    $scope.groups = property.value.groups;
    $scope.selectedGroup = null;

    $scope.selectGroup = function (group) {
        $scope.selectedGroup = group;
    };

    $scope.resetGroupSelection = function () {
        $scope.selectedGroup = null;
    };

    $scope.addGroup = function () {
        var group = {
            title: "",
            ingredients: []
        };

        $scope.groups.push(group);
    };

    $scope.removeGroup = function ($index) {
        $scope.groups.splice($index, 1);
    };

    $scope.groupSortingOptions = {
        distance: 5,
        cursor: "move",
        handle: ".group-tools-move",
        placeholder: "ingredient-group__placeholder",
    };
}]);

angular.module("umbraco").controller("ContentArea.PropertyEditors.VideoController", ["$scope", function ($scope) {
    var hosts = ["youtube"];

    var urlProviders = {
        youtube: function (videoId) {
            return "//www.youtube.com/embed/" + videoId;
        },
    };

    var property = $scope.property;

    if (!property.value || !property.value.id) {
        property.value = {
            id: null,
            url: null,
            host: hosts[0],
        };
    }

    $scope.videoId = property.value.id;
    $scope.videoHost = property.value.host;
    $scope.getVideoUrl = function () {
        var urlProvider = urlProviders[$scope.videoHost];

        return urlProvider($scope.videoId);
    };

    $scope.$watch("videoId", function () {
        property.value.id = $scope.videoId;
        property.value.host = $scope.videoHost;
        property.value.url = $scope.getVideoUrl();
    });
}]);