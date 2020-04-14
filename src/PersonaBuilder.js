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
    function PersonaBuilder(calc, inputSkills, personaName, inputTrait) {
        this.persona = null;
        this.inputTrait = null;
        this.maxLevel = 99;
        this.deep = false;
        this.depth = 3;
        this.limit = 10;
        this.calc = calc;
        this.inputSkills = inputSkills;
        this.persona = getCustomPersona(personaName);
        if (inputTrait != undefined)
            this.inputTrait = getTrait(inputTrait);
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
    PersonaBuilder.prototype.getFusionTree = function () {
        var unique = this.checkUnique();
        //If a persona was passed to the constructor
        if (this.persona != null) {
            if (!unique.possible)
                throw new Error("you entered unique skills that " + this.persona.name + " cannot learn");
            if (!this.checkInherit(this.inputSkills, this.persona))
                throw new Error("you entered skills that " + this.persona.name + " cannot inherit");
            return this.getPersonaTree(this.inputSkills, this.persona);
        }
        //If a persona was NOT passed to the constructor
        if (!unique.possible)
            throw new Error("you entered a combination of unique skills that no persona can learn");
        if (unique.persona != null)
            return this.getPersonaTree(this.inputSkills, unique.persona, this.inputTrait);
        return this.getAnyTree();
    };
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
    PersonaBuilder.prototype.checkUnique = function () {
        //simplify list to only include unique skills
        var inputUniques = [];
        for (var _i = 0, _a = this.inputSkills; _i < _a.length; _i++) {
            var skill = _a[_i];
            if (isUniqueSkill(skill))
                inputUniques.push(skill);
        }
        //check to see if the trait can be learned by the specific persona
        try {
            if (this.inputTrait.unique != null && this.inputTrait.unique != this.persona.name)
                return { persona: null, possible: false };
        }
        catch (e) { }
        //if there aren't any unique skills, it is possible and no spefic persona is required
        if (inputUniques.length === 0)
            return { persona: this.persona, possible: true };
        //check to see if the persona learns all the unique skills
        if (this.persona != null) {
            var check = this.filterSkills(this.persona, inputUniques);
            if (check.length > 0)
                return { persona: null, possible: false };
            return { persona: this.persona, possible: true };
        }
        //If compatible and inputUniques are not identical...
        // then the persona with the inputSkills does not exist
        var compatible = [];
        var result;
        for (var _b = 0, uniquePersonaeList_1 = uniquePersonaeList; _b < uniquePersonaeList_1.length; _b++) {
            var persona = uniquePersonaeList_1[_b];
            for (var _c = 0, _d = persona.uniqueSkills; _c < _d.length; _c++) {
                var unique = _d[_c];
                for (var _e = 0, inputUniques_1 = inputUniques; _e < inputUniques_1.length; _e++) {
                    var inputUnique = inputUniques_1[_e];
                    if (unique === inputUnique) {
                        result = persona;
                        compatible.push(inputUnique);
                    }
                }
            }
        }
        if (_.difference(compatible, inputUniques).length > 0)
            return { persona: null, possible: false };
        return { persona: result, possible: true };
    };
    /**
     * method to check if the persona passed will be able to inherit all the skills passed
     * @param inputSkills skills to check
     * @param persona persona to check
     */
    PersonaBuilder.prototype.checkInherit = function (inputSkills, persona) {
        for (var _i = 0, inputSkills_1 = inputSkills; _i < inputSkills_1.length; _i++) {
            var inputSkill = inputSkills_1[_i];
            var skill = skillMap[inputSkill];
            if (skill.element === "passive")
                continue;
            var inheritIndex = _.indexOf(inherits, persona.inherits);
            var elemIndex = _.indexOf(elems, skill.element);
            if (ratios[inheritIndex].charAt(elemIndex) === '-')
                return false;
        }
        return true;
    };
    /**
     * a set of possible fusion paths for the given persona with the given skills
     * @param personaName {string} persona to fuse to, if null will check ALL persona
     * @param inputSkills skills required for the persona
     * @param inputTrait should only be passed in royal version, the trait you would like the persona to have
     * @returns {Chain[][]} a list of possible fusion chains for the desired persona
     * where result[x][y] is of the type Chain, result[x][0].child === @param persona,
     *  and result[x][0].inheritance === @param skills
     */
    PersonaBuilder.prototype.getPersonaTree = function (inputSkills, targetPersona, inputTrait) {
        //Checks
        if (targetPersona === null)
            throw new Error(targetPersona.name + " not found, make sure your DLC setttings are correct");
        if (targetPersona.level > this.maxLevel)
            throw new Error(targetPersona.name + " exceeds your max level");
        if (!this.isPossible(targetPersona, inputSkills))
            throw new Error("fusion is not possible without skill cards or hangings");
        if (this.filterSkills(targetPersona, inputSkills).length === 0)
            throw new Error(targetPersona.name + " already learns all these skills at your level");
        this.deep = true;
        var result = [];
        if (targetPersona.special)
            this.deep = true;
        result.push(this.getFusionChain(targetPersona, inputSkills, inputTrait));
        return this.tidyChains(result);
    };
    /**
     * a set of possible fusion paths for several persona with the given skills
     * should not be used with unique skills as it will not bother with any special fusions
     * @param inputSkills skills required for the persona
     * @param inputTrait should only be passed in royal version, the trait you would like the persona to have
   * @returns {Chain[][]} a list of possible fusion chains for the desired persona
   * where result[x][y] is of the type Chain, result[x][0].child === @param persona,
     *  and result[x][0].inheritance === @param skills
     */
    PersonaBuilder.prototype.getAnyTree = function () {
        var result = [];
        var i = 0;
        var sortedPersonae = this.sortPossiblePersona(customPersonaeList, this.inputSkills, this.inputTrait);
        while (i < sortedPersonae.length) {
            var persona = sortedPersonae[i];
            var searchSkills = this.filterSkills(persona, this.inputSkills);
            var passTrait = this.inputTrait;
            try {
                if (persona.trait === this.inputTrait.name)
                    passTrait = null;
            }
            catch (e) { }
            var check = this.getFusionChain(persona, searchSkills, passTrait);
            if (this.verifyChain(check, this.inputSkills)) {
                if (this.inputTrait != null && passTrait === null)
                    check[0]["trait"] = this.inputTrait.name;
                result.push(check);
            }
            if (result.length >= this.limit && !this.deep)
                break;
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
     * @returns a list containing all the persona that have any of skills and/or traits
     * of the instance variable, sorted by how many skills traits the persona has
     */
    PersonaBuilder.prototype.sortPossiblePersona = function (personae, inputSkills, inputTrait) {
        var personaeWeight = [];
        for (var _i = 0, personae_1 = personae; _i < personae_1.length; _i++) {
            var persona = personae_1[_i];
            //Checks
            var multiSpecial = true;
            if (persona.special != null) {
                for (var _a = 0, special2Combos_1 = special2Combos; _a < special2Combos_1.length; _a++) {
                    var special = special2Combos_1[_a];
                    if (persona.name === special.result)
                        multiSpecial = false;
                }
                if (multiSpecial)
                    continue;
            }
            if (!this.isPossible(persona, inputSkills))
                continue;
            if (persona.level > this.maxLevel)
                continue;
            if (!this.checkInherit(inputSkills, persona))
                continue;
            var hasTrait = true;
            var skillsNeeded = inputSkills.length;
            personaeWeight.push({ persona: persona, weight: 0 });
            try {
                hasTrait = false;
                skillsNeeded += 1;
                if (persona.trait === inputTrait.name)
                    personaeWeight[personaeWeight.length - 1].weight += 1;
            }
            catch (e) { }
            for (var skill in persona.skills) {
                if (_.indexOf(inputSkills, skill) > -1) {
                    personaeWeight[personaeWeight.length - 1].weight += 1;
                    if (personaeWeight[personaeWeight.length - 1].weight === skillsNeeded && hasTrait)
                        throw new Error(persona.name + " already learns all the skills you need at your level");
                }
            }
        }
        //sort the personae by weight
        var sortedPersonaeWeight;
        sortedPersonaeWeight = personaeWeight.sort(function (n1, n2) {
            return n2.weight - n1.weight;
        });
        //remove any persona without weight
        if (!this.deep)
            _.remove(sortedPersonaeWeight, function (n) {
                return n.weight === 0;
            });
        //store the now sorted list of personae without their weight
        var sortedPersonae = [];
        for (var _b = 0, sortedPersonaeWeight_1 = sortedPersonaeWeight; _b < sortedPersonaeWeight_1.length; _b++) {
            var personaWeight = sortedPersonaeWeight_1[_b];
            sortedPersonae.push(personaWeight.persona);
        }
        return sortedPersonae;
    };
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
    PersonaBuilder.prototype.getFusionChain = function (persona, inputSkills, inputTrait, recurCount) {
        //If we've already exceeded the recursive depth...
        //	stop recurring and return null
        if (recurCount === undefined)
            recurCount = 0;
        if (recurCount >= this.depth)
            return null;
        var recipes = this.calc.getRecipes(persona);
        //Paralell arrays, possibilities[x] will be the recipe that can provide 
        //	the list of skills in couldLearn[x]
        var couldLearn = [];
        var possibilities = [];
        //Check all the immediate fusionTo recipes for any of the desired skills
        for (var _i = 0, recipes_1 = recipes; _i < recipes_1.length; _i++) {
            var recipe = recipes_1[_i];
            //skip any recipes that have sources that exceed max level
            var skip = false;
            for (var _a = 0, _b = recipe.sources; _a < _b.length; _a++) {
                var source = _b[_a];
                if (source.level > this.maxLevel) {
                    skip = true;
                    break;
                }
            }
            if (skip)
                continue;
            //Check if we have the desired trait
            var gotTrait = false;
            try {
                if (persona.trait === inputTrait.name)
                    gotTrait = true;
            }
            catch (e) { }
            //boolean used so we dont add duplicate recipe/skill arrays
            var track = false;
            var searchSkills = this.filterSkills(persona, inputSkills);
            //check both parents for any of the desired skills
            for (var _c = 0, _d = recipe.sources; _c < _d.length; _c++) {
                var parent_1 = _d[_c];
                for (var parentSkill in parent_1.skills)
                    for (var _e = 0, searchSkills_1 = searchSkills; _e < searchSkills_1.length; _e++) {
                        var searchSkill = searchSkills_1[_e];
                        if (parentSkill === searchSkill) {
                            if (!track) {
                                couldLearn.push([]);
                                possibilities.push(recipe);
                                track = true;
                            }
                            couldLearn[couldLearn.length - 1].push(searchSkill);
                        }
                    }
                //Check if we've found any skills
                if (couldLearn.length > 0) {
                    //Check if we've learned all the desired skills:
                    var check = _.isEqual(couldLearn[couldLearn.length - 1], searchSkills);
                    if (check) {
                        if (inputTrait != null)
                            if (gotTrait)
                                return [{
                                        "parents": recipe.sources,
                                        "child": recipe.result,
                                        "inheritance": couldLearn[couldLearn.length - 1],
                                        "trait": persona.trait
                                    }];
                            else
                                continue;
                        else
                            return [{
                                    "parents": recipe.sources,
                                    "child": recipe.result,
                                    "inheritance": couldLearn[couldLearn.length - 1],
                                }];
                    }
                    //remove any doubles, and any skills we might have already found for the next parent
                    couldLearn[couldLearn.length - 1] = _.uniq(couldLearn[couldLearn.length - 1]);
                    searchSkills = _.difference(searchSkills, couldLearn[couldLearn.length - 1]);
                }
            } //end parent loop
        } //end recipe loop
        var deepRecipes = [];
        if (possibilities.length != 0) {
            //remove any recipe doubles
            for (var _f = 0, couldLearn_1 = couldLearn; _f < couldLearn_1.length; _f++) {
                var arr = couldLearn_1[_f];
                arr = _.sortBy(arr);
            }
            possibilities = _.uniq(possibilities);
            couldLearn = _.uniq(couldLearn);
            //check all the recipes that had any desired skills/traits for parent fusions that could finish the chain
            this.chainHeapSort(possibilities, couldLearn);
            for (var i = possibilities.length - 1; i >= 0; i--) {
                for (var _g = 0, _h = possibilities[i].sources; _g < _h.length; _g++) {
                    var parent_2 = _h[_g];
                    if (couldLearn[i].length == 0)
                        continue;
                    //recursive call on the potential parents
                    var searchSkills = _.difference(inputSkills, couldLearn[i]);
                    var recur = this.getFusionChain(parent_2, searchSkills, inputTrait, recurCount + 1);
                    if (recur != null) {
                        var chain = void 0;
                        if (inputTrait != null) {
                            if (chain.trait != inputTrait.name)
                                continue;
                            chain = {
                                "parents": possibilities[i].sources,
                                "child": possibilities[i].result,
                                "inheritance": couldLearn[i],
                                "trait": inputTrait.name
                            };
                        }
                        else {
                            chain = {
                                "parents": possibilities[i].sources,
                                "child": possibilities[i].result,
                                "inheritance": couldLearn[i]
                            };
                        }
                        var result = [chain].concat(_.cloneDeep(recur));
                        if (this.verifyChain(result, inputSkills, inputTrait))
                            return result;
                    }
                }
            }
            if (this.deep)
                deepRecipes = _.intersection(recipes, possibilities);
        }
        if (this.deep) {
            var deepChain = void 0;
            if (deepRecipes.length === 0)
                deepRecipes = recipes;
            deepChain = this.getDeepChain(deepRecipes, persona, inputSkills, recurCount, inputTrait);
            if (deepChain != null)
                return deepChain;
        }
        return null;
    };
    PersonaBuilder.prototype.getDeepChain = function (recipes, persona, inputSkills, recurCount, inputTrait) {
        for (var i = 0; i < recipes.length; i++) {
            for (var _i = 0, _a = recipes[i].sources; _i < _a.length; _i++) {
                var parent_3 = _a[_i];
                var gotTrait = false;
                try {
                    if (parent_3.trait === inputTrait.name)
                        gotTrait = true;
                }
                catch (e) { }
                var searchSkills = this.filterSkills(persona, inputSkills);
                var recur = void 0;
                if (inputTrait != null && !gotTrait)
                    recur = this.getFusionChain(parent_3, searchSkills, inputTrait, recurCount + 1);
                else
                    recur = this.getFusionChain(parent_3, searchSkills, null, recurCount + 1);
                if (recur === null)
                    continue;
                var chain = void 0;
                if (gotTrait)
                    chain = {
                        "parents": recipes[i].sources,
                        "child": recipes[i].result,
                        "inheritance": searchSkills,
                        "trait": parent_3.trait
                    };
                else
                    chain = {
                        "parents": recipes[i].sources,
                        "child": recipes[i].result,
                        "inheritance": searchSkills
                    };
                var result = [chain].concat(_.cloneDeep(recur));
                if (this.verifyChain(result, inputSkills, inputTrait))
                    return result;
            }
        }
        return null;
    };
    /**
     * Verifies that all the skills in the array of
     * strings are inheritted somewhere in the give fusion chain
     * @param chain chain to check
     * @param skills skills used to check the chain
     * @return {boolean} true is all skills are present, otherwise false
     */
    PersonaBuilder.prototype.verifyChain = function (chain, skills, trait) {
        if (chain === null || _.indexOf(chain, null) > -1)
            return false;
        var hasTrait = false;
        var inheritance = [];
        for (var _i = 0, chain_1 = chain; _i < chain_1.length; _i++) {
            var link = chain_1[_i];
            inheritance = inheritance.concat(link.inheritance);
            try {
                if (link.trait === trait.name)
                    hasTrait = true;
            }
            catch (e) { }
        }
        if (trait != undefined && !hasTrait)
            return false;
        var check = _.difference(skills, inheritance);
        if (check.length === 0)
            return true;
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
                if (chain[i].trait != undefined && chain[i - 1].trait === undefined)
                    chain[i - 1]["trait"] = chain[i]["trait"];
                tidy = _.uniq(tidy);
                chain[i - 1].inheritance = tidy;
            }
        }
        return chains;
    };
    PersonaBuilder.prototype.setMaxLevel = function (maxLevel) {
        this.maxLevel = maxLevel;
    };
    PersonaBuilder.prototype.setDeep = function (deep) {
        this.deep = deep;
    };
    PersonaBuilder.prototype.setDepth = function (depth) {
        this.depth = depth;
    };
    PersonaBuilder.prototype.setLimit = function (limit) {
        this.limit = limit;
    };
    return PersonaBuilder;
}());
