///<reference path="../data/PersonaData.ts"/>
///<reference path="../data/SkillData.ts"/>

/**
 * Created by PickleProgramming on 05-Apr-20
 */


class FusionChainController {
	$scope

	constructor($scope, $routeParams, ChainService) {
		let personaName = $routeParams.fusion_chain
		this.$scope = $scope
		this.$scope.personaName = personaName
		this.$scope.chain
		let chains = ChainService.getChains()
		for (let chain of chains) {
			if (chain[0].child.name === this.$scope.personaName) {
				this.$scope.chain = chain
				break
			}
		}
		this.$scope.persona = personaMap[personaName]
		this.$scope.rootPersona = getRootPersonae(this.$scope.chain)
		
		// Note: skillList are skills in a sorted list for displaying with Angular.
		// It's different from the existing skills property which is a map.
		this.$scope.persona.skillList = getSkills(personaName);

		let inheritedSkillNames = []
		for (let link of this.$scope.chain) {
			for (let skill of link.inheritance) {
				inheritedSkillNames.push(skill)
			}
		}
		inheritedSkillNames = _.uniq(inheritedSkillNames)
		this.$scope.inheritedSkills = []
		for (let name of inheritedSkillNames) {
			this.$scope.inheritedSkills.push(skillMap[name])
		}

		// set the default sort param
		$scope.sortBy = 'level'
		$scope.sortReverse = false
		$scope.sortFunc = this.getSortValue.bind(this)

		// stats
		let compediumEntry = personaMap[personaName];
		this.$scope.persona.stats = compediumEntry.stats;
		this.$scope.persona.statsHeader = ["Strength", "Magic", "Endurance", "Agility", "Luck"];

		// elements
		// split the table into 2 for mobile
		let elems = getElems(personaName);
		this.$scope.persona.elems = elems;
		this.$scope.persona.elems1 = elems.slice(0, 5);
		this.$scope.persona.elems2 = elems.slice(5);

		// split the table into 2 for mobile
		let elemsHeader = ["Physical", "Gun", "Fire", "Ice", "Electric", "Wind", "Psychic", "Nuclear", "Bless", "Curse"];
		this.$scope.persona.elemsHeader = elemsHeader;
		this.$scope.persona.elemsHeader1 = elemsHeader.slice(0, 5);
		this.$scope.persona.elemsHeader2 = elemsHeader.slice(5);
	}

	private getSortValue(item) {
		let sortBy = this.$scope.sortBy
		if (sortBy === "arcana") {
			return item.arcana + (item.level >= 10 ? item.level : ("0" + item.level))
		}
		else {
			return item[sortBy]
		}
	}
}
