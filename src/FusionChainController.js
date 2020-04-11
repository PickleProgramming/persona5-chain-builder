///<reference path="../data/PersonaData.ts"/>
///<reference path="../data/SkillData.ts"/>
/**
 * Created by PickleProgramming on 05-Apr-20
 */
var FusionChainController = /** @class */ (function () {
    function FusionChainController($scope, $routeParams, ChainService) {
        var personaName = $routeParams.fusion_chain;
        this.$scope = $scope;
        this.$scope.personaName = personaName;
        this.$scope.chain;
        var chains = ChainService.getChains();
        for (var _i = 0, chains_1 = chains; _i < chains_1.length; _i++) {
            var chain = chains_1[_i];
            if (chain[0].child.name === this.$scope.personaName) {
                this.$scope.chain = chain;
                break;
            }
        }
        this.$scope.persona = personaMap[personaName];
        this.$scope.rootPersona = getRootPersonae(this.$scope.chain);
        // Note: skillList are skills in a sorted list for displaying with Angular.
        // It's different from the existing skills property which is a map.
        this.$scope.persona.skillList = getSkills(personaName);
        var inheritedSkillNames = [];
        for (var _a = 0, _b = this.$scope.chain; _a < _b.length; _a++) {
            var link = _b[_a];
            for (var _c = 0, _d = link.inheritance; _c < _d.length; _c++) {
                var skill = _d[_c];
                inheritedSkillNames.push(skill);
            }
        }
        inheritedSkillNames = _.uniq(inheritedSkillNames);
        this.$scope.inheritedSkills = [];
        for (var _e = 0, inheritedSkillNames_1 = inheritedSkillNames; _e < inheritedSkillNames_1.length; _e++) {
            var name_1 = inheritedSkillNames_1[_e];
            this.$scope.inheritedSkills.push(skillMap[name_1]);
        }
        // set the default sort param
        $scope.sortBy = 'level';
        $scope.sortReverse = false;
        $scope.sortFunc = this.getSortValue.bind(this);
        // stats
        var compediumEntry = personaMap[personaName];
        this.$scope.persona.stats = compediumEntry.stats;
        this.$scope.persona.statsHeader = ["Strength", "Magic", "Endurance", "Agility", "Luck"];
        // elements
        // split the table into 2 for mobile
        var elems = getElems(personaName);
        this.$scope.persona.elems = elems;
        this.$scope.persona.elems1 = elems.slice(0, 5);
        this.$scope.persona.elems2 = elems.slice(5);
        // split the table into 2 for mobile
        var elemsHeader = ["Physical", "Gun", "Fire", "Ice", "Electric", "Wind", "Psychic", "Nuclear", "Bless", "Curse"];
        this.$scope.persona.elemsHeader = elemsHeader;
        this.$scope.persona.elemsHeader1 = elemsHeader.slice(0, 5);
        this.$scope.persona.elemsHeader2 = elemsHeader.slice(5);
    }
    FusionChainController.prototype.getSortValue = function (item) {
        var sortBy = this.$scope.sortBy;
        if (sortBy === "arcana") {
            return item.arcana + (item.level >= 10 ? item.level : ("0" + item.level));
        }
        else {
            return item[sortBy];
        }
    };
    return FusionChainController;
}());
