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

class BuilderController {
	$scope;

	constructor($scope, ChainService) {
		this.$scope = $scope
		this.$scope.chains = []
		this.$scope.children = []

		// set the default sort param
		$scope.sortBy = 'level'
		$scope.sortReverse = false
		$scope.sortFunc = this.getSortValue.bind(this)

		// set default inputs
		$scope.targetPersona = null
		$scope.inputSkills = []

		// bring arrays for searching into scope
		$scope.skillNames = skillNames
		$scope.customStandardPersonaeNames = customPersonaeNames

		this.$scope.builder = new PersonaBuilder(new FusionCalculator(customPersonaeByArcana));

		/**
		 * Clears input and resets table
		 */
		this.$scope.clearInput = () => {
			this.$scope.inputSkills = []
			this.$scope.chains = []
			this.$scope.children = []
			this.$scope.targetPersona = null
			this.$scope.maxLevel = null
			this.$scope.$broadcast('angucomplete-alt:clearInput')
		}

		/**
		 * chains lists of fusion chains for the specified persona
		 * Because of how anucomplete-alt handles entries we must get the name from their object
		 */
		this.$scope.build = () => {
			let searchSkills = []
			//FIXME: should these be strings, or skill objects?
			for (let input of this.$scope.inputSkills) {
				searchSkills.push(input.originalObject.name)
			}
			//targetPersona is null by default, but if it was specified by the user, pass it to function
			//	again, since we're using angucomplete-alt we need to pull the string from their object
			let targetPersona = null
			if (this.$scope.targetPersona != null) {
				targetPersona = this.$scope.targetPersona.originalObject.name
			}
			this.$scope.chains = this.$scope.builder.getFusionTree(searchSkills, targetPersona, this.$scope.maxLevel)
			this.$scope.children = this.getChildren(this.$scope.chains)
			//add the info to the service so we can pass it to the next controller
			ChainService.setChains(this.$scope.chains)
		}
	}

	/**
	 * function for returning each child at the beginning of every chain
	 * and also logging their length to the number array passed by reference
	 * @param chains set of chains to get the first links of
	 * @param lengths array to log their lengths into
	 * @returns {PersonaData, numer} returns an object with the persona data 
	 * along with the length of their respective chain (fusionNum)
	 */
	private getChildren(chains: Chain[][]): FirstLink[] {
		let result: FirstLink[] = []
		for (let chain of chains){
			let add: FirstLink = chain[0].child
			add.fusionNum = chain.length
			result.push(add)
		}
		return result
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

/**
 * interface to facilitate and extra variable to allow for sorting chains 
 * by their length with ng-repeat
 */
interface FirstLink extends PersonaData {
	fusionNum?: number		
}

