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
	constructor(calc: FusionCalculator) {
		this.calc = calc;
	}

	/**
 	 * a set of possible fusion paths for either the given persona with the given skills
	 * or ANY persona with the given skills is no persona is specified
 	 * @param personaName {string} persona to fuse to, if null will check ALL persona
 	 * @param inputSkills skills required for the persona
	 * @param maxLevel persona required for fusion will not exceed this level
	 * @param deep number specifying how many links to keep looking if none of the immediate parents 
	 * 	posess any of the desired. Set it to -1 if you don't want the algorithm to stop until 
	 *  it's found a chain. not recommended
 	 * @param limit maximum number of fusion chains to check (only applicable if persona is null)
 	 * @param depth maximum length of each fusion chain
	 * @returns {Chain[][]} a list of possible fusion chains for the desired persona 
	 * where result[x][y] is of the type Chain, result[x][0].child === @param persona,
 	 *  and result[x][0].inheritance === @param skills 
 	 */
	public getFusionTree(inputSkills: string[], personaName: string, maxLevel?: number, deep?: boolean, depth?: number, limit?: number): Chain[][] {
		if (maxLevel === null || maxLevel === undefined) {
			maxLevel = 99
		}
		if (depth === null || depth === undefined) {
			depth = 5
		}
		if (limit === null || limit === undefined) {
			limit = 20
		}
		if (deep === null || deep === undefined) {
			deep = true
		}

		if (personaName != null) {
			let unique = this.checkUnique(inputSkills, personaName)
			//if there are unique skills and they arene't compatible...
			//	throw an error
			if (!unique.possible) {
				throw new Error("you entered unique skills that " + personaName + " cannot learn")
			}
			return this.getPersonaTree(inputSkills, personaName, deep, maxLevel, depth)
		}
		let unique = this.checkUnique(inputSkills)
		if (!unique.possible) {
			throw new Error("you entered a combination of unique skills that no persona can learn")
		}
		if (unique.persona != null) {
			return this.getPersonaTree(inputSkills, unique.persona.name, deep, maxLevel, depth)
		}
		return this.getAnyTree(inputSkills, deep, maxLevel, depth, limit)
	}

	/**
	 * FIXME: gotta be a better way to do this, I don't think I'd understand this if someone else wrote it
	 * Makes sure that if any of the inputSkills are unique, the passed persona
	 * (if any) can learn all of them. If no persona is passed, the funciton will return
	 * the persona that can learn all the unique skills
	 * @param inputSkills  list of skills the user inputted
	 * @param persona the persona the user inputted (if any)
	 * @returns {persona: PersonaData, possible: boolean} where persona is either the 
	 * persona that can learn the unique skills, or null if none such exists, and possible 
	 * is if the unique skills are compatible (true is no unique skills were passed)
	 */
	private checkUnique(inputSkills: string[], personaName?: string): { persona: PersonaData, possible: boolean } {
		//simplify list to only include unique skills
		let inputUniques: string[] = []
		for (let skill of inputSkills) {
			if (isUniqueSkill(skill)) {
				inputUniques.push(skill)
			}
		}
		let persona: PersonaData
		if (personaName != undefined) {
			persona = getCustomPersona(personaName)
		} else {
			persona = null
		}

		//if there aren't any unique skills, it is possible and no spefic persona is required
		if (inputUniques.length === 0) {
			return { persona: persona, possible: true }
		}

		if (persona != null) {//if a persona was passed...
			//check to see if the persona learns all the unique skills
			let check = this.filterSkills(persona, inputUniques)
			//if check is not null, then the persona did NOT learn all the unique skills
			if (check.length > 0) {
				return { persona: null, possible: false }
			}
			return { persona: persona, possible: true }
		}

		let compatible: string[] = []
		let result: PersonaData
		for (let persona of uniquePersonaeList) {
			for (let unique of persona.uniqueSkills) {
				for (let inputUnique of inputUniques) {
					if (unique === inputUnique) {
						result = persona
						compatible.push(inputUnique)
					}
				}
			}
		}
		//If compatible and inputUniques are not identical...
		// then the persona with the inputSkills does not exist
		if (_.difference(compatible, inputUniques).length > 0) {
			return { persona: null, possible: false }
		}
		return { persona: result, possible: true }
	}

	/**
 	 * a set of possible fusion paths for the given persona with the given skills
 	 * @param personaName {string} persona to fuse to, if null will check ALL persona
 	 * @param inputSkills skills required for the persona
	 * @param deep boolean specifiying if the algorithm should search until either a special fusion 
	 * is found or the limit of chain length is reached. can lead to some drastic increases 
	 * in computaional time
	 * @param maxLevel persona required for fusion will not exceed this level
 	 * @param limit maximum number of fusion chains to check (only applicable if persona is null)
 	 * @param depth maximum length of each fusion chain
	 * @returns {Chain[][]} a list of possible fusion chains for the desired persona 
	 * where result[x][y] is of the type Chain, result[x][0].child === @param persona,
 	 *  and result[x][0].inheritance === @param skills 
 	 */
	private getPersonaTree(inputSkills: string[], personaName?: string, deep?: boolean, maxLevel?: number, depth?: number): Chain[][] {
		let persona = getCustomPersona(personaName)
		if (persona === null || persona === undefined) {
			throw new Error(persona.name + " not found, make sure your DLC setttings are correct")
		}
		if (persona.level > maxLevel) {
			throw new Error(persona.name + " exceeds your max level")
		}
		if (!this.isPossible(persona, inputSkills)) {
			throw new Error("fusion is not possible without skill cards or hangings")
		}
		let skills = this.filterSkills(persona, inputSkills)
		if (skills.length === 0) {
			throw new Error(persona.name + " already learns all these skills at your level")
		}
		let result: Chain[][] = []
		//if the desired persona is a special fusion...
		//	enable the deep option, otherwise don't
		if (persona.special) {
			result.push(this.getFusionChain(persona, inputSkills, true, maxLevel, depth))
		} else {
			result.push(this.getFusionChain(persona, inputSkills, deep, maxLevel, depth))
		}
		return this.tidyChains(result)
	}

	/**
	 * a set of possible fusion paths for several persona with the given skills
	 * should not be used with unique skills as it will not bother with any special fusions
	 * @param inputSkills skills required for the persona
	 * @param deep boolean specifiying if the algorithm should search until either a special fusion 
	 * is found or the limit of chain length is reached. can lead to some drastic increases 
	 * in computaional time
   * @param maxLevel persona required for fusion will not exceed this level
	 * @param limit maximum number of fusion chains to check (only applicable if persona is null)
	 * @param depth maximum length of each fusion chain
   * @returns {Chain[][]} a list of possible fusion chains for the desired persona 
   * where result[x][y] is of the type Chain, result[x][0].child === @param persona,
	 *  and result[x][0].inheritance === @param skills 
	 */
	private getAnyTree(inputSkills: string[], deep: boolean, maxLevel: number, depth: number, limit: number): Chain[][] {
		//Map each persona to a number reflecting how many of the desired skills they have		
		type PersonaWeight = { persona: PersonaData, weight: number }
		let personaeWeight: PersonaWeight[] = []
		for (let persona of customStandardPersonaeList) {
			//this function doesn't work with special fusions
			let multiSpecial: boolean = true
			if (persona.special != undefined) {
				for (let special of special2Combos) {
					if (persona.name === special.result) {
						multiSpecial = false
					}
				}
				if (multiSpecial) {
					continue
				}
			}
			//check to make sure the fusion is possible
			if (!this.isPossible(persona, inputSkills)) { continue }
			//don't check persona that exceed the maxLevel
			if (persona.level > maxLevel) { continue }

			personaeWeight.push({ persona: persona, weight: 0 })
			for (let skill in persona.skills) {
				if (_.indexOf(inputSkills, skill) > -1) {
					personaeWeight[personaeWeight.length - 1].weight += 1
					if (personaeWeight[personaeWeight.length - 1].weight === inputSkills.length) {
						throw new Error(persona.name + " already learns all the skills you need at your level")
					}
				}
			}
		}
		//sort the personae by weight
		let sortedPersonaeWeight: { persona: PersonaData, weight: number }[]
		sortedPersonaeWeight = personaeWeight.sort((n1, n2) => {
			return n2.weight - n1.weight
		})
		//store the now sorted list of personae without their weight
		let sortedPersonae: PersonaData[] = []
		for (let personaWeight of sortedPersonaeWeight) {
			sortedPersonae.push(personaWeight.persona)
		}

		let result: Chain[][] = []
		let i: number = 0
		while (i < sortedPersonae.length && result.length < limit) {
			let persona = sortedPersonae[i]
			let searchSkills = this.filterSkills(persona, inputSkills)
			//find a fusion chain with all the skills and the current persona
			let check = this.getFusionChain(persona, searchSkills, deep, maxLevel, depth)
			//make sure the chain is ok
			if (this.verifyChain(check, inputSkills)) {
				result.push(check)
			}
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
	 * returns a single fusion chain that will result in the desired persona with the desired skills
	 * @param persona resultant persona
	 * @param inputSkills skills you with the resultant to posess
	 * @param deep boolean specifiying if the algorithm should search until either a special fusion 
	 * is found or the limit of chain length is reached. can lead to some drastic increases 
	 * in computaional time
	 * @param maxLevel persona required for fusion will not exceed this level
	 * @param depth the lenght of the fusion chain 
	 * @param recurCount current recursive depth
	 * @returns {Chain[]} a single fusion chain in the form of a Chain[] where result[0].child === @param persona,
 	 *  and result[0].inheritance === @param skills
	 * 	null if there are no efficent fusion chains
	 */
	private getFusionChain(persona: PersonaData, inputSkills: string[], deep: boolean, maxLevel: number, depth: number, recurCount = 0): Chain[] {

		//If we've already exceeded the recursive depth...
		//	stop recurring and return null
		if (recurCount >= depth)
			return null

		//Paralell arrays, possibilities[x] will be the recipe that can provide 
		//	the list of skills in couldLearn[x]
		let couldLearn: string[][] = []
		let possibilities: Recipe[] = []

		//get all possible recipes to this persona
		let recipes = this.calc.getRecipes(persona)

		//Check all the immediate fusionTo recipes for any of the desired skills
		for (let recipe of recipes) {

			//If the recipe exceeds the maxLevel:
			//	skip it
			let skip: boolean = false
			for (let source of recipe.sources) {
				if (source.level > maxLevel) {
					skip = true
					break
				}
			}
			if (skip) { continue }

			//boolean used so we dont add duplicate recipe/skill arrays
			let track = false
			let searchSkills = this.filterSkills(persona, inputSkills)
			//check both parents for any of the desired skills
			for (let parent of recipe.sources) {
				for (let parentSkill in parent.skills) {
					for (let searchSkill of searchSkills) {
						if (parentSkill === searchSkill) {
							if (!track) {
								//keep track of any potential skills
								couldLearn.push([])
								//keep track of potential recipes
								possibilities.push(recipe)
								track = true
							}
							couldLearn[couldLearn.length - 1].push(searchSkill)
						}
					}
				}
				//If we've found any skills...
				if (couldLearn.length > 0) {
					//If we've learned all the desired skills:
					//	return the fusion chain
					let check = _.isEqual(couldLearn[couldLearn.length - 1], searchSkills)
					if (check) {
						return [{
							"parents": recipe.sources,
							"child": recipe.result,
							"inheritance": couldLearn[couldLearn.length - 1]
						}]
					}

					//FIXME: do I really need this? I already account for this stuff right?
					//remove any doubles, and any skills we might have already found for the next parent
					couldLearn[couldLearn.length - 1] = _.uniq(couldLearn[couldLearn.length - 1])
					searchSkills = _.difference(searchSkills, couldLearn[couldLearn.length - 1])
				}
			} //end parent loop
		} //end recipe loop

		//if deep option is enabled, go until the chain is complete
		if (deep) {
			for (let i = 0; i < recipes.length; i++) {
				for (let parent of recipes[i].sources) {
					let searchSkills = this.filterSkills(persona, inputSkills)
					let recur = this.getFusionChain(parent, searchSkills, deep, maxLevel, depth, recurCount + 1)
					//if we reached recursive depth, try the next parent
					if (recur === null) {
						continue
					}
					let chain: Chain = {
						"parents": recipes[i].sources,
						"child": recipes[i].result,
						"inheritance": searchSkills
					}
					let result: Chain[] = [chain].concat(_.cloneDeep(recur))
					if (this.verifyChain(result, inputSkills)) {
						return result
					}
				}
			}
		}
		if (deep) { return null }

		//If we've checked all the immediate recipes and didn't find ANY of the necessary skills...
		if (possibilities.length === 0) { return null }

		//remove any recipe doubles
		//	we sort here to ensure that the uniq function works on the two dimensional array
		for (let arr of couldLearn) {
			arr = _.sortBy(arr)
		}
		possibilities = _.uniq(possibilities)
		couldLearn = _.uniq(couldLearn)

		//sort the parallel arrays so that the parents with the most skills are checked first
		this.chainHeapSort(possibilities, couldLearn)

		//If we HAVE found at least one skill...
		//	begin checking the next chain for inputSkills from the possibilities we saved
		for (let i = possibilities.length - 1; i >= 0; i--) {
			for (let parent of possibilities[i].sources) {
				if (couldLearn[i].length == 0) { continue }
				//the skills we would still need if we were to follow this chain
				let searchSkills = _.difference(inputSkills, couldLearn[i])
				//recursive call on the potential parents
				let recur = this.getFusionChain(parent, searchSkills, false, maxLevel, depth, recurCount + 1)
				//if the tree is kosher...
				//	we've completed a chain!
				if (recur != null) {
					let chain: Chain = {
						"parents": possibilities[i].sources,
						"child": possibilities[i].result,
						"inheritance": couldLearn[i]
					}
					let result: Chain[] = [chain].concat(_.cloneDeep(recur))
					if (this.verifyChain(result, inputSkills)) {
						return result
					}
				}
			}
		} //end possibilities loop
		//If we have checked all chains to the specified depth and not found all the skills:
		throw new Error("No possible fusions were found, perhaps you are too low level. If you are willing to wait longer, you could try increasing your depth.")
	}

	/**
	 * Verifies that all the skills in the array of 
	 * strings are inheritted somewhere in the give fusion chain
	 * @param chain chain to check
	 * @param skills skills used to check the chain
	 * @return {boolean} true is all skills are present, otherwise false
	 */
	private verifyChain(chain: Chain[], skills: string[]): boolean {
		if (chain === null || _.indexOf(chain, null) > -1) {
			return false
		}
		let inheritance: string[] = []
		for (let link of chain) {
			inheritance.concat(link.inheritance)
		}
		let check = _.difference(inheritance, skills)
		if (check.length === 0) {
			return true
		}
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
				tidy = _.uniq(tidy)
				chain[i - 1].inheritance = tidy
			}
		}
		return chains
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
}