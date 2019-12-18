module.exports = [
	// life tank
	{
		health: 500,
		attack: 100,
		speed: 3,
		mp: 100,
		mpRate: 5,
		bulletRate: 1,
		bulletNum: 5,
		passiveSkill: "lifeTree",
		super: "heal"
	},
	// fire tank
	{
		health: 400,
		attack: 130,
		speed: 3,
		mp: 100,
		mpRate: 5,
		bulletRate: 1,
		bulletNum: 5,
		passiveSkill: "resurrect",
		super: "flamethrower"
	},
	// shield tank
	{
		health: 600,
		attack: 80,
		speed: 3,
		mp: 100,
		mpRate: 5,
		bulletRate: 1,
		bulletNum: 5,
		passiveSkill: "shield",
		super: "sword"
	},
	// ocean tank
	{
		health: 450,
		attack: 100,
		speed: 3,
		mp: 100,
		mpRate: 5,
		bulletRate: 1,
		bulletNum: 5,
		passiveSkill: "magicSteal",
		super: "surf"
	},
	// sand tank
	{
		health: 400,
		attack: 120,
		speed: 3,
		mp: 100,
		mpRate: 5,
		bulletRate: 1,
		bulletNum: 5,
		passiveSkill: "sandstorm",
		super: "invisible"
	},
	// shadow tank
	{
		health: 400,
		attack: 120,
		speed: 3,
		mp: 100,
		mpRate: 5,
		bulletRate: 1,
		bulletNum: 5,
		passiveSkill: "ninja",
		super: "teleport"
	}
];
