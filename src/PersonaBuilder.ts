///<reference path="DataUtil.ts"/>
///<reference path="FusionCalculator.ts"/>

/**
 * TODO: Account for inheritance
 * TODO: account for skill cards and hangings
 * TODO: determine the minimum level/skills each parent will need to have to pass on the proper number of skills
 * TODO: provide UI feedback for these errors
 * TODO: check to see if the max level is too low for a skill
 * Persona Builder. Provides method for determining the list 
 * of possible skills any persona could inherit
 * 
 * Created by PickleProgramming on 05-Apr-20
 */
class PersonaBuilder {

	private calc;
	private inputSkills: string[]
	private persona: PersonaData = null
	private inputTrait: SkillData = null

	private maxLevel: number = 99
	private deep: boolean = false
	private depth: number = 3
	private limit: number = 10

	constructor(calc: FusionCalculator, inputSkills: string[], personaName: string, inputTrait?: string) {
		this.calc = calc;
		this.inputSkills = inputSkills
		this.persona = getCustomPersona(personaName)
		if (inputTrait != undefined)
			this.inputTrait = getTrait(inputTrait)
	}

	/**
 	 * a set of possible fusion paths for either the given persona with the given skills
	 * or ANY persona with the given skills is no persona is specified
 	 * @param personaName {string} persona to fuse to, if null will check ALL persona
 	 * @param inputSkills skills required for the persona
	 * @param inputTrait should only be passed in royal version, the trait you would like the persona to have
	 * @returns {Chain[][]} a list of possible fusion chains for the desired persona 
	 * where result[x][y] is of the type Chain, result[x][0].child === @param persona,
 	 *  and result[x][0].inheritance === @param skills 
 	 */
	public getFusionTree(): Chain[][] {

		let unique = this.checkUnique()

		//If a persona was passed to the constructor
		if (this.persona != null) {
			if (!unique.possible)
				throw new Error("you entered unique skills that " + this.persona.name + " cannot learn")
			if (!this.checkInherit(this.inputSkills, this.persona))
				throw new Error("you entered skills that " + this.persona.name + " cannot inherit")
			return this.getPersonaTree(this.inputSkills, this.persona)
		}

		//If a persona was NOT passed to the constructor
		if (!unique.possible)
			throw new Error("you entered a combination of unique skills that no persona can learn")
		if (unique.persona != null)
			return this.getPersonaTree(this.inputSkills, unique.persona, this.inputTrait)
		return this.getAnyTree()
	}

	/**
	 * Makes sure that if any of the inputSkills are unique, the passed persona
	 * (if any) can learn all of them. If no persona is passed, the funciton will return
	 * the persona that can learn all the unique skills
	 * @param inputSkills  list of skills the user inputted
	 * @param persona the persona the user inputted (if any)
	 * @param inputTrait should only be passed in royal version, the trait you would like the persona to have
	 * @returns {persona: PersonaData, possible: boolean} where persona is either the 
	 * persona that can learn the unique skills, or null if none such exists, and possible 
	 * is if the unique skills are compatible (true is no unique skills were passed)
	 */
	private checkUnique(): { persona: PersonaData, possible: boolean } {
		//simplify list to only include unique skills
		let inputUniques: string[] = []
		for (let skill of this.inputSkills)
			if (isUniqueSkill(skill))
				inputUniques.push(skill)

		//check to see if the trait can be learned by the specific persona
		try {
			if (this.inputTrait.unique != null && this.inputTrait.unique != this.persona.name)
				return { persona: null, possible: false }
		} catch (e) { }

		//if there aren't any unique skills, it is possible and no spefic persona is required
		if (inputUniques.length === 0)
			return { persona: this.persona, possible: true }

		//check to see if the persona learns all the unique skills
		if (this.persona != null) {
			let check = this.filterSkills(this.persona, inputUniques)
			if (check.length > 0)
				return { persona: null, possible: false }
			return { persona: this.persona, possible: true }
		}

		//If compatible and inputUniques are not identical...
		// then the persona with the inputSkills does not exist
		let compatible: string[] = []
		let result: PersonaData
		for (let persona of uniquePersonaeList)
			for (let unique of persona.uniqueSkills)
				for (let inputUnique of inputUniques)
					if (unique === inputUnique) {
						result = persona
						compatible.push(inputUnique)
					}
		if (_.difference(compatible, inputUniques).length > 0)
			return { persona: null, possible: false }

		return { persona: result, possible: true }
	}


	/**
	 * method to check if the persona passed will be able to inherit all the skills passed
	 * @param inputSkills skills to check
	 * @param persona persona to check
	 */
	private checkInherit(inputSkills: string[], persona: PersonaData): boolean {
		for (let inputSkill of inputSkills) {
			let skill = skillMap[inputSkill]
			if (skill.element === "passive")
				continue
			let inheritIndex: number = _.indexOf(inherits, persona.inherits)
			let elemIndex: number = _.indexOf(elems, skill.element)
			if (ratios[inheritIndex].charAt(elemIndex) === '-')
				return false
		}
		return true
	}

	/**
 	 * a set of possible fusion paths for the given persona with the given skills
 	 * @param personaName {string} persona to fuse to, if null will check ALL persona
 	 * @param inputSkills skills required for the persona
	 * @param inputTrait should only be passed in royal version, the trait you would like the persona to have
	 * @returns {Chain[][]} a list of possible fusion chains for the desired persona 
	 * where result[x][y] is of the type Chain, result[x][0].child === @param persona,
 	 *  and result[x][0].inheritance === @param skills 
 	 */
	private getPersonaTree(inputSkills: string[], targetPersona: PersonaData, inputTrait?: SkillData): Chain[][] {
		//Checks
		if (targetPersona === null)
			throw new Error(targetPersona.name + " not found, make sure your DLC setttings are correct")
		if (targetPersona.level > this.maxLevel)
			throw new Error(targetPersona.name + " exceeds your max level")
		if (!this.isPossible(targetPersona, inputSkills))
			throw new Error("fusion is not possible without skill cards or hangings")
		if (this.filterSkills(targetPersona, inputSkills).length === 0)
			throw new Error(targetPersona.name + " already learns all these skills at your level")
		this.deep = true

		let result: Chain[][] = []
		if (targetPersona.special)
			this.deep = true
		result.push(this.getFusionChain(targetPersona, inputSkills, inputTrait))
		return this.tidyChains(result)
	}

	/**
	 * a set of possible fusion paths for several persona with the given skills
	 * should not be used with unique skills as it will not bother with any special fusions
	 * @param inputSkills skills required for the persona
	 * @param inputTrait should only be passed in royal version, the trait you would like the persona to have
   * @returns {Chain[][]} a list of possible fusion chains for the desired persona 
   * where result[x][y] is of the type Chain, result[x][0].child === @param persona,
	 *  and result[x][0].inheritance === @param skills 
	 */
	private getAnyTree(): Chain[][] {
		let result: Chain[][] = []
		let i: number = 0
		let sortedPersonae: PersonaData[] = this.sortPossiblePersona(customPersonaeList, this.inputSkills, this.inputTrait)
		while (i < sortedPersonae.length) {
			let persona: PersonaData = sortedPersonae[i]
			let searchSkills: string[] = this.filterSkills(persona, this.inputSkills)
			let passTrait: SkillData = this.inputTrait
			try {
				if (persona.trait === this.inputTrait.name)
					passTrait = null
			} catch (e) { }
			let check = this.getFusionChain(persona, searchSkills, passTrait)
			if (this.verifyChain(check, this.inputSkills)) {
				if (this.inputTrait != null && passTrait === null)
					check[0]["trait"] = this.inputTrait.name
				result.push(check)
			}
			if (result.length >= this.limit && !this.deep)
				break
			i++
		}
		return this.tidyChains(result)
	}

	/**
	 * Returns a new array with any of the skills the persona has or may learn from the passed array removed
	 * @param persona persona to check the skills of
	 * @param inputSkills array to modify
	 * @returns {string[]} the modified string
	 */
	private filterSkills(persona: PersonaData, inputSkills: string[]): string[] {
		let learned: string[] = []
		for (let personaSkill in persona.skills) {
			for (let inputSkill of inputSkills) {
				if (personaSkill === inputSkill) {
					learned.push(inputSkill)
				}
			}
		}
		return _.difference(inputSkills, learned)
	}

	/**
	 * Since at most only 4 skills may be passed down in standard fusion
	 * it is possible that the user may enter an unatainable set of skills
	 * this function will determine if that is the case
	 * TODO: this does not take skill cards or hangings into account
	 * @param persona persona to check is possible to have the specified skills
	 * @param inputSkills skills to check the persona for
	 * @returns {boolean} true if the persona is possible with standard fusion alone
	 * false otherwise
	 */
	private isPossible(persona: PersonaData, inputSkills: string[]): boolean {
		let maxSkills: number = 4
		//if the persona is a product of a 3+ special fusion...
		// max skills are equal to 5
		if (persona.special != undefined && _.indexOf(special2Combos, persona) === -1) {
			maxSkills = 5
		}
		if (inputSkills.length <= maxSkills) {
			return true
		}
		//number of skills from inputSkils the persona learns innately
		let count = 0
		for (let skill in persona.skills) {
			for (let inputSkill of inputSkills) {
				if (skill === inputSkill)
					count++
			}
		}
		if (inputSkills.length - count <= maxSkills) {
			return true
		}
		return false
	}

	/**
	 * @returns a list containing all the persona that have any of skills and/or traits 
	 * of the instance variable, sorted by how many skills traits the persona has
	 */
	private sortPossiblePersona(personae: PersonaData[], inputSkills: string[], inputTrait: SkillData): PersonaData[] {
		type PersonaWeight = { persona: PersonaData, weight: number }
		let personaeWeight: PersonaWeight[] = []
		for (let persona of personae) {

			//Checks
			let multiSpecial: boolean = true
			if (persona.special != null) {
				for (let special of special2Combos) {
					if (persona.name === special.result)
						multiSpecial = false
				}
				if (multiSpecial)
					continue
			}
			if (!this.isPossible(persona, inputSkills))
				continue
			if (persona.level > this.maxLevel)
				continue
			if (!this.checkInherit(inputSkills, persona))
				continue

			let hasTrait: boolean = true
			let skillsNeeded = inputSkills.length
			personaeWeight.push({ persona: persona, weight: 0 })
			try {
				hasTrait = false
				skillsNeeded += 1
				if (persona.trait === inputTrait.name)
					personaeWeight[personaeWeight.length - 1].weight += 1
			} catch (e) { }
			for (let skill in persona.skills) {
				if (_.indexOf(inputSkills, skill) > -1) {
					personaeWeight[personaeWeight.length - 1].weight += 1
					if (personaeWeight[personaeWeight.length - 1].weight === skillsNeeded && hasTrait)
						throw new Error(persona.name + " already learns all the skills you need at your level")
				}
			}
		}
		//sort the personae by weight
		let sortedPersonaeWeight: { persona: PersonaData, weight: number }[]
		sortedPersonaeWeight = personaeWeight.sort((n1, n2) => {
			return n2.weight - n1.weight
		})
		//remove any persona without weight
		if (!this.deep)
			_.remove(sortedPersonaeWeight, (n) => {
				return n.weight === 0
			})
		//store the now sorted list of personae without their weight
		let sortedPersonae: PersonaData[] = []
		for (let personaWeight of sortedPersonaeWeight)
			sortedPersonae.push(personaWeight.persona)
		return sortedPersonae
	}

	/**
	 * returns a single fusion chain that will result in the desired persona with the desired skills
	 * @param persona resultant persona
	 * @param inputSkills skills you with the resultant to posess
	 * @param inputTrait the trait you would like the persona to have
	 * @param recurCount current recursive depth
	 * @returns {Chain[]} a single fusion chain in the form of a Chain[] where result[0].child === @param persona,
 	 *  and result[0].inheritance === @param skills
	 * 	null if there are no efficent fusion chains
	 */
	private getFusionChain(persona: PersonaData, inputSkills: string[], inputTrait?: SkillData, recurCount?: number): Chain[] {

		//If we've already exceeded the recursive depth...
		//	stop recurring and return null
		if (recurCount === undefined)
			recurCount = 0
		if (recurCount >= this.depth)
			return null


		let recipes = this.calc.getRecipes(persona)
		//Paralell arrays, possibilities[x] will be the recipe that can provide 
		//	the list of skills in couldLearn[x]
		let couldLearn: string[][] = []
		let possibilities: Recipe[] = []

		//Check all the immediate fusionTo recipes for any of the desired skills
		for (let recipe of recipes) {
			//skip any recipes that have sources that exceed max level
			let skip: boolean = false
			for (let source of recipe.sources)
				if (source.level > this.maxLevel) {
					skip = true
					break
				}
			if (skip)
				continue

			//Check if we have the desired trait
			let gotTrait: boolean = false
			try {
				if (persona.trait === inputTrait.name)
					gotTrait = true
			} catch (e) { }

			//boolean used so we dont add duplicate recipe/skill arrays
			let track: boolean = false
			let searchSkills: string[] = this.filterSkills(persona, inputSkills)
			//check both parents for any of the desired skills
			for (let parent of recipe.sources) {
				for (let parentSkill in parent.skills)
					for (let searchSkill of searchSkills)
						if (parentSkill === searchSkill) {
							if (!track) {
								couldLearn.push([])
								possibilities.push(recipe)
								track = true
							}
							couldLearn[couldLearn.length - 1].push(searchSkill)
						}
				//Check if we've found any skills
				if (couldLearn.length > 0) {
					//Check if we've learned all the desired skills:
					let check = _.isEqual(couldLearn[couldLearn.length - 1], searchSkills)
					if (check) {
						if (inputTrait != null)
							if (gotTrait)
								return [{
									"parents": recipe.sources,
									"child": recipe.result,
									"inheritance": couldLearn[couldLearn.length - 1],
									"trait": persona.trait
								}]
							else
								continue
						else
							return [{
								"parents": recipe.sources,
								"child": recipe.result,
								"inheritance": couldLearn[couldLearn.length - 1],
							}]
					}
					//remove any doubles, and any skills we might have already found for the next parent
					couldLearn[couldLearn.length - 1] = _.uniq(couldLearn[couldLearn.length - 1])
					searchSkills = _.difference(searchSkills, couldLearn[couldLearn.length - 1])
				}
			} //end parent loop
		} //end recipe loop

		let deepRecipes: Recipe[] = []
		if (possibilities.length != 0) {
			//remove any recipe doubles
			for (let arr of couldLearn)
				arr = _.sortBy(arr)
			possibilities = _.uniq(possibilities)
			couldLearn = _.uniq(couldLearn)

			//check all the recipes that had any desired skills/traits for parent fusions that could finish the chain
			this.chainHeapSort(possibilities, couldLearn)
			for (let i = possibilities.length - 1; i >= 0; i--) {
				for (let parent of possibilities[i].sources) {
					if (couldLearn[i].length == 0)
						continue
					//recursive call on the potential parents
					let searchSkills = _.difference(inputSkills, couldLearn[i])
					let recur = this.getFusionChain(parent, searchSkills, inputTrait, recurCount + 1)
					if (recur != null) {
						let chain: Chain
						if (inputTrait != null) {
							if (chain.trait != inputTrait.name)
								continue
							chain = {
								"parents": possibilities[i].sources,
								"child": possibilities[i].result,
								"inheritance": couldLearn[i],
								"trait": inputTrait.name
							}
						} else {
							chain = {
								"parents": possibilities[i].sources,
								"child": possibilities[i].result,
								"inheritance": couldLearn[i]
							}
						}
						let result: Chain[] = [chain].concat(_.cloneDeep(recur))
						if (this.verifyChain(result, inputSkills, inputTrait))
							return result
					}
				}
			}
			if (this.deep)
				deepRecipes = _.intersection(recipes, possibilities)
		}
		if (this.deep) {
			let deepChain: Chain[]
			if (deepRecipes.length === 0)
				deepRecipes = recipes
			deepChain = this.getDeepChain(deepRecipes, persona, inputSkills, recurCount, inputTrait)
			if (deepChain != null)
				return deepChain
		}
		return null
	}

	private getDeepChain(recipes: Recipe[], persona: PersonaData, inputSkills: string[], recurCount: number, inputTrait?: SkillData): Chain[] {
		for (let i = 0; i < recipes.length; i++) {
			for (let parent of recipes[i].sources) {
				let gotTrait: boolean = false
				try {
					if (parent.trait === inputTrait.name)
						gotTrait = true
				} catch (e) { }

				let searchSkills = this.filterSkills(persona, inputSkills)
				let recur: Chain[]
				if (inputTrait != null && !gotTrait)
					recur = this.getFusionChain(parent, searchSkills, inputTrait, recurCount + 1)
				else
					recur = this.getFusionChain(parent, searchSkills, null, recurCount + 1)
				if (recur === null)
					continue

				let chain: Chain
				if (gotTrait)
					chain = {
						"parents": recipes[i].sources,
						"child": recipes[i].result,
						"inheritance": searchSkills,
						"trait": parent.trait
					}
				else
					chain = {
						"parents": recipes[i].sources,
						"child": recipes[i].result,
						"inheritance": searchSkills
					}
				let result: Chain[] = [chain].concat(_.cloneDeep(recur))
				if (this.verifyChain(result, inputSkills, inputTrait))
					return result
			}
		}
		return null
	}

	/**
	 * Verifies that all the skills in the array of 
	 * strings are inheritted somewhere in the give fusion chain
	 * @param chain chain to check
	 * @param skills skills used to check the chain
	 * @return {boolean} true is all skills are present, otherwise false
	 */
	private verifyChain(chain: Chain[], skills: string[], trait?: SkillData): boolean {
		if (chain === null || _.indexOf(chain, null) > -1)
			return false
		let hasTrait: boolean = false
		let inheritance: string[] = []
		for (let link of chain) {
			inheritance = inheritance.concat(link.inheritance)
			try {
				if (link.trait === trait.name)
					hasTrait = true
			} catch (e) { }
		}
		if (trait != undefined && !hasTrait)
			return false
		let check = _.difference(skills, inheritance)
		if (check.length === 0)
			return true
		return false
	}

	/**
	 * custom heapsort function to order the parralell arrays possibilities[] and couldLearn[]
	 *  by the length of couldLearns subarrays, so the subarrays with the highest number of
	 * 	desired skills are on top
	 * see https://en.wikipedia.org/wiki/Heapsort for more info
	 * @param possibilities array of recipes
	 * @param couldLearn two dimensional array of strings
	 * @returns {void}
	 */
	private chainHeapSort(possibilities: Recipe[], couldLearn: string[][]): void {
		let l = possibilities.length

		for (let i = Math.floor(l / 2); i >= 0; i -= 1) {
			this.chainHeapRoot(possibilities, couldLearn, i, l)
		}

		for (let i = possibilities.length - 1; i > 0; i--) {
			this.chainSwap(possibilities, couldLearn, 0, i)
			l--
			this.chainHeapRoot(possibilities, couldLearn, 0, l)
		}
	}

	/**
	 * helper function for modified heap sort
	 * see https://en.wikipedia.org/wiki/Heapsort for more info
	 */
	private chainHeapRoot(possibilities: Recipe[], couldLearn: string[][], i: number, l: number): void {
		let left = 2 * i + 1
		let right = 2 * i + 2
		let max = i

		if (left < l && couldLearn[left].length > couldLearn[max].length) {
			max = left
		}
		if (right < l && couldLearn[right].length > couldLearn[max].length) {
			max = right
		}
		if (max != i) {
			this.chainSwap(possibilities, couldLearn, i, max)
			this.chainHeapRoot(possibilities, couldLearn, max, l)
		}
	}

	/**
	 * helper function for modified heap sort
	 * see https://en.wikipedia.org/wiki/Heapsort for more info
	 */
	private chainSwap(possibilities: Recipe[], couldLearn: string[][], indexA: number, indexB: number): void {
		let tempPoss = possibilities[indexA]
		let tempCould = couldLearn[indexA]

		possibilities[indexA] = possibilities[indexB]
		couldLearn[indexA] = couldLearn[indexB]

		possibilities[indexB] = tempPoss
		couldLearn[indexB] = tempCould
	}
	/**
	 * Trickles the inheritance[] down through the chain,
	 *  so at each level it reflects which skills should 
	 *  be inheritted for each fusion more accurately
	 * @param chain chain to be tidied
	 * @returns {Chain[]} returns the tidied chain
	 */
	private tidyChains(chains: Chain[][]): Chain[][] {
		for (let chain of chains) {
			for (let i = chain.length - 1; i >= 1; i--) {
				let tidy = chain[i - 1].inheritance.concat(chain[i].inheritance)
				if (chain[i].trait != undefined && chain[i - 1].trait === undefined)
					chain[i - 1]["trait"] = chain[i]["trait"]
				tidy = _.uniq(tidy)
				chain[i - 1].inheritance = tidy
			}
		}
		return chains
	}

	public setMaxLevel(maxLevel: number): void {
		this.maxLevel = maxLevel
	}

	public setDeep(deep: boolean): void {
		this.deep = deep
	}

	public setDepth(depth: number): void {
		this.depth = depth
	}

	public setLimit(limit: number): void {
		this.limit = limit
	}
}

/**
 * Interface for a chain of fusions
 * Includes the two FusionChains that fuse to make a persona
 * as well as their child, and a list of the skills the child will inherit
 */
interface Chain {
	parents: PersonaData[]
	child: PersonaData
	inheritance: string[]
	special?: boolean
	trait?: string
}