///<reference path="PersonaController.ts"/>
///<reference path="PersonaListController.ts"/>
///<reference path="BuilderController.ts"/>
///<reference path="SkillListController.ts"/>
///<reference path="SettingController.ts"/>
///<reference path="FusionChainController.ts"/>

declare var angular;

let StickyTableDirective = () => ({
	restrict: 'A',
	link: function ($scope, $element) {
		$element.stickyTableHeaders();
		$scope.$on('$destroy', function () {
			$element.stickyTableHeaders('destroy');
		});
	}
});
//
let myModule = angular.module('myModule', ['ngRoute', 'angucomplete-alt']);

myModule.factory('ChainService', () => {
	this.chains

	let getChains = (): Chain[][] => {
		return this.chains
	}

	let setChains = (chains: Chain[][]): void => {
		this.chains = chains
	}

	return {
		getChains: getChains,
		setChains: setChains
	}
})

myModule.directive('stickyTable', StickyTableDirective);
myModule.controller('FusionChainController', ['$scope', FusionChainController]);
myModule.controller('PersonaController', ['$scope', PersonaController]);
myModule.controller('PersonaListController', ['$scope', PersonaListController]);
myModule.controller('BuilderController', ['$scope', BuilderController]);
myModule.config(function ($routeProvider) {
	$routeProvider.when('/list', { templateUrl: 'view/list.html', controller: PersonaListController });
	$routeProvider.when('/persona/:persona_name', { templateUrl: 'view/persona.html', controller: PersonaController });
	$routeProvider.when('/builder', { templateUrl: 'view/builder.html', controller: BuilderController });
	$routeProvider.when('/fusionChain/:fusion_chain', { templateUrl: 'view/fusionChain.html', controller: FusionChainController });
	$routeProvider.when('/skill', { templateUrl: 'view/skill.html', controller: SkillListController });
	$routeProvider.when('/setting', { templateUrl: 'view/setting.html', controller: SettingController });
});
myModule.run(function ($rootScope, $location, $route, $window) {
	$rootScope.$on('$locationChangeStart', function (event) {
		if (!$location.path()) {
			$location.path('/list');
			$route.reload();
		} else {
			$window.scrollTo(0, 0);
		}
	});
});