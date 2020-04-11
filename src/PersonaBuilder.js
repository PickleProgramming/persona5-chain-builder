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
var PersonaBuilder = /** @class */ (function () {
    function PersonaBuilder(calc) {
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
    PersonaBuilder.prototype.getFusionTree = function (inputSkills, personaName, maxLevel, deep, depth, limit) {
        if (maxLevel === null || maxLevel === undefined) {
            maxLevel = 99;
        }
        if (depth === null || depth === undefined) {
            depth = 5;
        }
        if (limit === null || limit === undefined) {
            limit = 20;
        }
        if (deep === null || deep === undefined) {
            deep = true;
        }
        if (personaName != null) {
            var unique_1 = this.checkUnique(inputSkills, personaName);
            //if there are unique skills and they arene't compatible...
            //	throw an error
            if (!unique_1.possible) {
                throw new Error("you entered unique skills that " + personaName + " cannot learn");
            }
            return this.getPersonaTree(inputSkills, personaName, deep, maxLevel, depth);
        }
        var unique = this.checkUnique(inputSkills);
        if (!unique.possible) {
            throw new Error("you entered a combination of unique skills that no persona can learn");
        }
        if (unique.persona != null) {
            return this.getPersonaTree(inputSkills, unique.persona.name, deep, maxLevel, depth);
        }
        return this.getAnyTree(inputSkills, deep, maxLevel, depth, limit);
    };
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
    PersonaBuilder.prototype.checkUnique = function (inputSkills, personaName) {
        //simplify list to only include unique skills
        var inputUniques = [];
        for (var _i = 0, inputSkills_1 = inputSkills; _i < inputSkills_1.length; _i++) {
            var skill = inputSkills_1[_i];
            if (isUniqueSkill(skill)) {
                inputUniques.push(skill);
            }
        }
        var persona;
        if (personaName != undefined) {
            persona = getCustomPersona(personaName);
        }
        else {
            persona = null;
        }
        //if there aren't any unique skills, it is possible and no spefic persona is required
        if (inputUniques.length === 0) {
            return { persona: persona, possible: true };
        }
        if (persona != null) { //if a persona was passed...
            //check to see if the persona learns all the unique skills
            var check = this.filterSkills(persona, inputUniques);
            //if check is not null, then the persona did NOT learn all the unique skills
            if (check.length > 0) {
                return { persona: null, possible: false };
            }
            return { persona: persona, possible: true };
        }
        var compatible = [];
        var result;
        for (var _a = 0, uniquePersonaeList_1 = uniquePersonaeList; _a < uniquePersonaeList_1.length; _a++) {
            var persona_1 = uniquePersonaeList_1[_a];
            for (var _b = 0, _c = persona_1.uniqueSkills; _b < _c.length; _b++) {
                var unique = _c[_b];
                for (var _d = 0, inputUniques_1 = inputUniques; _d < inputUniques_1.length; _d++) {
                    var inputUnique = inputUniques_1[_d];
                    if (unique === inputUnique) {
                        result = persona_1;
                        compatible.push(inputUnique);
                    }
                }
            }
        }
        //If compatible and inputUniques are not identical...
        // then the persona with the inputSkills does not exist
        if (_.difference(compatible, inputUniques).length > 0) {
            return { persona: null, possible: false };
        }
        return { persona: result, possible: true };
    };
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
    PersonaBuilder.prototype.getPersonaTree = function (inputSkills, personaName, deep, maxLevel, depth) {
        var persona = getCustomPersona(personaName);
        if (persona === null || persona === undefined) {
            throw new Error(persona.name + " not found, make sure your DLC setttings are correct");
        }
        if (persona.level > maxLevel) {
            throw new Error(persona.name + " exceeds your max level");
        }
        if (!this.isPossible(persona, inputSkills)) {
            throw new Error("fusion is not possible without skill cards or hangings");
        }
        var skills = this.filterSkills(persona, inputSkills);
        if (skills.length === 0) {
            throw new Error(persona.name + " already learns all these skills at your level");
        }
        var result = [];
        //if the desired persona is a special fusion...
        //	enable the deep option, otherwise don't
        if (persona.special) {
            result.push(this.getFusionChain(persona, inputSkills, true, maxLevel, depth));
        }
        else {
            result.push(this.getFusionChain(persona, inputSkills, deep, maxLevel, depth));
        }
        return this.tidyChains(result);
    };
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
    PersonaBuilder.prototype.getAnyTree = function (inputSkills, deep, maxLevel, depth, limit) {
        var personaeWeight = [];
        for (var _i = 0, customStandardPersonaeList_1 = customStandardPersonaeList; _i < customStandardPersonaeList_1.length; _i++) {
            var persona = customStandardPersonaeList_1[_i];
            //this function doesn't work with special fusions
            var multiSpecial = true;
            if (persona.special != undefined) {
                for (var _a = 0, special2Combos_1 = special2Combos; _a < special2Combos_1.length; _a++) {
                    var special = special2Combos_1[_a];
                    if (persona.name === special.result) {
                        multiSpecial = false;
                    }
                }
                if (multiSpecial) {
                    continue;
                }
            }
            //check to make sure the fusion is possible
            if (!this.isPossible(persona, inputSkills)) {
                continue;
            }
            //don't check persona that exceed the maxLevel
            if (persona.level > maxLevel) {
                continue;
            }
            personaeWeight.push({ persona: persona, weight: 0 });
            for (var skill in persona.skills) {
                if (_.indexOf(inputSkills, skill) > -1) {
                    personaeWeight[personaeWeight.length - 1].weight += 1;
                    if (personaeWeight[personaeWeight.length - 1].weight === inputSkills.length) {
                        throw new Error(persona.name + " already learns all the skills you need at your level");
                    }
                }
            }
        }
        //sort the personae by weight
        var sortedPersonaeWeight;
        sortedPersonaeWeight = personaeWeight.sort(function (n1, n2) {
            return n2.weight - n1.weight;
        });
        //store the now sorted list of personae without their weight
        var sortedPersonae = [];
        for (var _b = 0, sortedPersonaeWeight_1 = sortedPersonaeWeight; _b < sortedPersonaeWeight_1.length; _b++) {
            var personaWeight = sortedPersonaeWeight_1[_b];
            sortedPersonae.push(personaWeight.persona);
        }
        var result = [];
        var i = 0;
        while (i < sortedPersonae.length && result.length < limit) {
            var persona = sortedPersonae[i];
            var searchSkills = this.filterSkills(persona, inputSkills);
            //find a fusion chain with all the skills and the current persona
            var check = this.getFusionChain(persona, searchSkills, deep, maxLevel, depth);
            //make sure the chain is ok
            if (this.verifyChain(check, inputSkills)) {
                result.push(check);
            }
            i++;
        }
        return this.tidyChains(result);
    };
    /**
     * Returns a new array with any of the skills the persona has or may learn from the passed array removed
     * @param persona persona to check the skills of
     * @param inputSkills array to modify
     * @returns {string[]} the modified string
     */
    PersonaBuilder.prototype.filterSkills = function (persona, inputSkills) {
        var learned = [];
        for (var personaSkill in persona.skills) {
            for (var _i = 0, inputSkills_2 = inputSkills; _i < inputSkills_2.length; _i++) {
                var inputSkill = inputSkills_2[_i];
                if (personaSkill === inputSkill) {
                    learned.push(inputSkill);
                }
            }
        }
        return _.difference(inputSkills, learned);
    };
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
    PersonaBuilder.prototype.isPossible = function (persona, inputSkills) {
        var maxSkills = 4;
        //if the persona is a product of a 3+ special fusion...
        // max skills are equal to 5
        if (persona.special != undefined && _.indexOf(special2Combos, persona) === -1) {
            maxSkills = 5;
        }
        if (inputSkills.length <= maxSkills) {
            return true;
        }
        //number of skills from inputSkils the persona learns innately
        var count = 0;
        for (var skill in persona.skills) {
            for (var _i = 0, inputSkills_3 = inputSkills; _i < inputSkills_3.length; _i++) {
                var inputSkill = inputSkills_3[_i];
                if (skill === inputSkill)
                    count++;
            }
        }
        if (inputSkills.length - count <= maxSkills) {
            return true;
        }
        return false;
    };
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
    PersonaBuilder.prototype.getFusionChain = function (persona, inputSkills, deep, maxLevel, depth, recurCount) {
        if (recurCount === void 0) { recurCount = 0; }
        //If we've already exceeded the recursive depth...
        //	stop recurring and return null
        if (recurCount >= depth)
            return null;
        //Paralell arrays, possibilities[x] will be the recipe that can provide 
        //	the list of skills in couldLearn[x]
        var couldLearn = [];
        var possibilities = [];
        //get all possible recipes to this persona
        var recipes = this.calc.getRecipes(persona);
        //Check all the immediate fusionTo recipes for any of the desired skills
        for (var _i = 0, recipes_1 = recipes; _i < recipes_1.length; _i++) {
            var recipe = recipes_1[_i];
            //If the recipe exceeds the maxLevel:
            //	skip it
            var skip = false;
            for (var _a = 0, _b = recipe.sources; _a < _b.length; _a++) {
                var source = _b[_a];
                if (source.level > maxLevel) {
                    skip = true;
                    break;
                }
            }
            if (skip) {
                continue;
            }
            //boolean used so we dont add duplicate recipe/skill arrays
            var track = false;
            var searchSkills = this.filterSkills(persona, inputSkills);
            //check both parents for any of the desired skills
            for (var _c = 0, _d = recipe.sources; _c < _d.length; _c++) {
                var parent_1 = _d[_c];
                for (var parentSkill in parent_1.skills) {
                    for (var _e = 0, searchSkills_1 = searchSkills; _e < searchSkills_1.length; _e++) {
                        var searchSkill = searchSkills_1[_e];
                        if (parentSkill === searchSkill) {
                            if (!track) {
                                //keep track of any potential skills
                                couldLearn.push([]);
                                //keep track of potential recipes
                                possibilities.push(recipe);
                                track = true;
                            }
                            couldLearn[couldLearn.length - 1].push(searchSkill);
                        }
                    }
                }
                //If we've found any skills...
                if (couldLearn.length > 0) {
                    //If we've learned all the desired skills:
                    //	return the fusion chain
                    var check = _.isEqual(couldLearn[couldLearn.length - 1], searchSkills);
                    if (check) {
                        return [{
                                "parents": recipe.sources,
                                "child": recipe.result,
                                "inheritance": couldLearn[couldLearn.length - 1]
                            }];
                    }
                    //FIXME: do I really need this? I already account for this stuff right?
                    //remove any doubles, and any skills we might have already found for the next parent
                    couldLearn[couldLearn.length - 1] = _.uniq(couldLearn[couldLearn.length - 1]);
                    searchSkills = _.difference(searchSkills, couldLearn[couldLearn.length - 1]);
                }
            } //end parent loop
        } //end recipe loop
        //if deep option is enabled, go until the chain is complete
        if (deep) {
            for (var i = 0; i < recipes.length; i++) {
                for (var _f = 0, _g = recipes[i].sources; _f < _g.length; _f++) {
                    var parent_2 = _g[_f];
                    var searchSkills = this.filterSkills(persona, inputSkills);
                    var recur = this.getFusionChain(parent_2, searchSkills, deep, maxLevel, depth, recurCount + 1);
                    //if we reached recursive depth, try the next parent
                    if (recur === null) {
                        continue;
                    }
                    var chain = {
                        "parents": recipes[i].sources,
                        "child": recipes[i].result,
                        "inheritance": searchSkills
                    };
                    var result = [chain].concat(_.cloneDeep(recur));
                    if (this.verifyChain(result, inputSkills)) {
                        return result;
                    }
                }
            }
        }
        if (deep) {
            return null;
        }
        //If we've checked all the immediate recipes and didn't find ANY of the necessary skills...
        if (possibilities.length === 0) {
            return null;
        }
        //remove any recipe doubles
        //	we sort here to ensure that the uniq function works on the two dimensional array
        for (var _h = 0, couldLearn_1 = couldLearn; _h < couldLearn_1.length; _h++) {
            var arr = couldLearn_1[_h];
            arr = _.sortBy(arr);
        }
        possibilities = _.uniq(possibilities);
        couldLearn = _.uniq(couldLearn);
        //sort the parallel arrays so that the parents with the most skills are checked first
        this.chainHeapSort(possibilities, couldLearn);
        //If we HAVE found at least one skill...
        //	begin checking the next chain for inputSkills from the possibilities we saved
        for (var i = possibilities.length - 1; i >= 0; i--) {
            for (var _j = 0, _k = possibilities[i].sources; _j < _k.length; _j++) {
                var parent_3 = _k[_j];
                if (couldLearn[i].length == 0) {
                    continue;
                }
                //the skills we would still need if we were to follow this chain
                var searchSkills = _.difference(inputSkills, couldLearn[i]);
                //recursive call on the potential parents
                var recur = this.getFusionChain(parent_3, searchSkills, false, maxLevel, depth, recurCount + 1);
                //if the tree is kosher...
                //	we've completed a chain!
                if (recur != null) {
                    var chain = {
                        "parents": possibilities[i].sources,
                        "child": possibilities[i].result,
                        "inheritance": couldLearn[i]
                    };
                    var result = [chain].concat(_.cloneDeep(recur));
                    if (this.verifyChain(result, inputSkills)) {
                        return result;
                    }
                }
            }
        } //end possibilities loop
        //If we have checked all chains to the specified depth and not found all the skills:
        throw new Error("No possible fusions were found, perhaps you are too low level. If you are willing to wait longer, you could try increasing your depth.");
    };
    /**
     * Verifies that all the skills in the array of
     * strings are inheritted somewhere in the give fusion chain
     * @param chain chain to check
     * @param skills skills used to check the chain
     * @return {boolean} true is all skills are present, otherwise false
     */
    PersonaBuilder.prototype.verifyChain = function (chain, skills) {
        if (chain === null || _.indexOf(chain, null) > -1) {
            return false;
        }
        var inheritance = [];
        for (var _i = 0, chain_1 = chain; _i < chain_1.length; _i++) {
            var link = chain_1[_i];
            inheritance.concat(link.inheritance);
        }
        var check = _.difference(inheritance, skills);
        if (check.length === 0) {
            return true;
        }
        return false;
    };
    /**
     * custom heapsort function to order the parralell arrays possibilities[] and couldLearn[]
     *  by the length of couldLearns subarrays, so the subarrays with the highest number of
     * 	desired skills are on top
     * see https://en.wikipedia.org/wiki/Heapsort for more info
     * @param possibilities array of recipes
     * @param couldLearn two dimensional array of strings
     * @returns {void}
     */
    PersonaBuilder.prototype.chainHeapSort = function (possibilities, couldLearn) {
        var l = possibilities.length;
        for (var i = Math.floor(l / 2); i >= 0; i -= 1) {
            this.chainHeapRoot(possibilities, couldLearn, i, l);
        }
        for (var i = possibilities.length - 1; i > 0; i--) {
            this.chainSwap(possibilities, couldLearn, 0, i);
            l--;
            this.chainHeapRoot(possibilities, couldLearn, 0, l);
        }
    };
    /**
     * helper function for modified heap sort
     * see https://en.wikipedia.org/wiki/Heapsort for more info
     */
    PersonaBuilder.prototype.chainHeapRoot = function (possibilities, couldLearn, i, l) {
        var left = 2 * i + 1;
        var right = 2 * i + 2;
        var max = i;
        if (left < l && couldLearn[left].length > couldLearn[max].length) {
            max = left;
        }
        if (right < l && couldLearn[right].length > couldLearn[max].length) {
            max = right;
        }
        if (max != i) {
            this.chainSwap(possibilities, couldLearn, i, max);
            this.chainHeapRoot(possibilities, couldLearn, max, l);
        }
    };
    /**
     * helper function for modified heap sort
     * see https://en.wikipedia.org/wiki/Heapsort for more info
     */
    PersonaBuilder.prototype.chainSwap = function (possibilities, couldLearn, indexA, indexB) {
        var tempPoss = possibilities[indexA];
        var tempCould = couldLearn[indexA];
        possibilities[indexA] = possibilities[indexB];
        couldLearn[indexA] = couldLearn[indexB];
        possibilities[indexB] = tempPoss;
        couldLearn[indexB] = tempCould;
    };
    /**
     * Trickles the inheritance[] down through the chain,
     *  so at each level it reflects which skills should
     *  be inheritted for each fusion more accurately
     * @param chain chain to be tidied
     * @returns {Chain[]} returns the tidied chain
     */
    PersonaBuilder.prototype.tidyChains = function (chains) {
        for (var _i = 0, chains_1 = chains; _i < chains_1.length; _i++) {
            var chain = chains_1[_i];
            for (var i = chain.length - 1; i >= 1; i--) {
                var tidy = chain[i - 1].inheritance.concat(chain[i].inheritance);
                tidy = _.uniq(tidy);
                chain[i - 1].inheritance = tidy;
            }
        }
        return chains;
    };
    return PersonaBuilder;
}());
