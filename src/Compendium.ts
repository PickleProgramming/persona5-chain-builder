import * as demonData from "../data/p5/demon-data.json"
import * as skillData from "../data/p5/skill-data.json"

/**
 * List of demon objects
 */
const demons: { [name: string]: Demon }[] = (() => {
	let result: { [name: string]: Demon }[] = []
	for (let [name, json] of Object.entries(demonData)) {
		result[name] = {
			name,
			item: json['item'],
			race: json['race'],
			lvl: json['lvl'],
			skills: json['skills'],
			price: Math.pow(json['stats'].reduce((acc, stat) => stat + acc, 0), 2) + 2000,
			stats: json['stats'],
			resists: json['resists'].split('').map(char => this.compConfig.resistCodes[char]),
			fusion: json['fusion'] || 'normal',
			inherit: json['inherits']
		}
		if (json['itemr']) {
			demons[name].item += (', ' + json['itemr'])
		}
	}
	return result
})()

/**
 * list of skill objects
 */
const skills: { [name: string]: Skill }[] = (() => {
	let result: { [name: string]: Skill }[] = []
	for (let [name, json] of Object.entries(skillData)) {
		result[name] = {
			name,
			element: json['element'],
			effect: json['effect'],
			rank: json['cost'] / 100 || 0,
			cost: json['cost'] || 0,
			transfer: [],
			learnedBy: [],
			level: 0
		};

		if (json['card']) {
			skills[name].transfer = [{ demon: json['card'], level: -100 }];
		}

		if (json['unique']) {
			skills[name].rank = 99;
		}
	}
	return result
})()

interface Demon {
	name: string;
	inherit?: string;
	lvl: number;
	race: string;
	price: number;
	inherits?: boolean[];
	skills: { [skill: string]: number; };
	stats: number[];
	fusion: string;
	prereq?: string;
	affinities?: number[];
	estats?: number[];
	area?: string;
	drop?: string;
	isEnemy?: boolean;
	align?: string;
}

interface Skill {
	element: string;
	rank: number;
	name: string;
	cost: number;
	effect: string;
	level: number;
	damage?: string;
	requires?: string;
	inherit?: string;
	unique?: boolean;
	learnedBy: { demon: string, level: number }[];
}