module.exports = [
	// life tank
	{
		health: 500,
		attack: 80,
		speed: 3,
		mp: 100,
		mpRate: 1,
		bulletRate: 1,
		bulletNum: 5,
		passiveSkill: "heal",
		super: "lifeTree"
	},
	// fire tank
	{
		health: 400,
		attack: 130,
		speed: 3,
		mp: 100,
		mpRate: 1,
		bulletRate: 1,
		bulletNum: 5,
		passiveSkill: "resurrect",
		super: "fireBall"
	},
	// shield tank
	{
		health: 600,
		attack: 120,
		speed: 3,
		mp: 100,
		mpRate: 1,
		bulletRate: 1,
		bulletNum: 5,
		passiveSkill: "shield",
		super: "lightShield"
	},
	// ocean tank
	{
		health: 450,
		attack: 100,
		speed: 3,
		mp: 100,
		mpRate: 1,
		bulletRate: 1,
		bulletNum: 5,
		passiveSkill: "magicSteal",
		super: "freeze"
	},
	// sand tank
	{
		health: 400,
		attack: 120,
		speed: 3,
		mp: 100,
		mpRate: 1,
		bulletRate: 1,
		bulletNum: 5,
		passiveSkill: "invisible",
		super: "sandStorm"
	},
	// shadow tank
	{
		health: 400,
		attack: 120,
		speed: 3,
		mp: 100,
		mpRate: 1,
		bulletRate: 1,
		bulletNum: 5,
		passiveSkill: "ninja",
		super: "portal"
	}
];
