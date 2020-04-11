///<reference path="PersonaBuilder.ts"/>
///<reference path="../data/PersonaData.ts"/>
///<reference path="App.ts"/>
/**
 * TODO: Refactor to ChainBuilder or something like that
 * Persona Builder. Provides method for determining the list
 * of possible skills any persona could inherit
 *
 * Created by PickleProgramming on 05-Apr-20
 */
var BuilderController = /** @class */ (function () {
    function BuilderController($scope, ChainService) {
        var _this = this;
        this.$scope = $scope;
        this.$scope.chains = [];
        this.$scope.children = [];
        // set the default sort param
        $scope.sortBy = 'level';
        $scope.sortReverse = false;
        $scope.sortFunc = this.getSortValue.bind(this);
        // set default inputs
        $scope.targetPersona = null;
        $scope.inputSkills = [];
        // bring arrays for searching into scope
        $scope.skillNames = skillNames;
        $scope.customStandardPersonaeNames = customPersonaeNames;
        this.$scope.builder = new PersonaBuilder(new FusionCalculator(customPersonaeByArcana));
        /**
         * Clears input and resets table
         */
        this.$scope.clearInput = function () {
            _this.$scope.inputSkills = [];
            _this.$scope.chains = [];
            _this.$scope.children = [];
            _this.$scope.targetPersona = null;
            _this.$scope.maxLevel = null;
            _this.$scope.$broadcast('angucomplete-alt:clearInput');
        };
        /**
         * chains lists of fusion chains for the specified persona
         * Because of how anucomplete-alt handles entries we must get the name from their object
         */
        this.$scope.build = function () {
            var searchSkills = [];
            //FIXME: should these be strings, or skill objects?
            for (var _i = 0, _a = _this.$scope.inputSkills; _i < _a.length; _i++) {
                var input = _a[_i];
                searchSkills.push(input.originalObject.name);
            }
            //targetPersona is null by default, but if it was specified by the user, pass it to function
            //	again, since we're using angucomplete-alt we need to pull the string from their object
            var targetPersona = null;
            if (_this.$scope.targetPersona != null) {
                targetPersona = _this.$scope.targetPersona.originalObject.name;
            }
            _this.$scope.chains = _this.$scope.builder.getFusionTree(searchSkills, targetPersona, _this.$scope.maxLevel);
            _this.$scope.children = _this.getChildren(_this.$scope.chains);
            //add the info to the service so we can pass it to the next controller
            ChainService.setChains(_this.$scope.chains);
        };
    }
    /**
     * function for returning each child at the beginning of every chain
     * and also logging their length to the number array passed by reference
     * @param chains set of chains to get the first links of
     * @param lengths array to log their lengths into
     * @returns {PersonaData, numer} returns an object with the persona data
     * along with the length of their respective chain (fusionNum)
     */
    BuilderController.prototype.getChildren = function (chains) {
        var result = [];
        for (var _i = 0, chains_1 = chains; _i < chains_1.length; _i++) {
            var chain = chains_1[_i];
            var add = chain[0].child;
            add.fusionNum = chain.length;
            result.push(add);
        }
        return result;
    };
    BuilderController.prototype.getSortValue = function (item) {
        var sortBy = this.$scope.sortBy;
        if (sortBy === "arcana") {
            return item.arcana + (item.level >= 10 ? item.level : ("0" + item.level));
        }
        else {
            return item[sortBy];
        }
    };
    return BuilderController;
}());
