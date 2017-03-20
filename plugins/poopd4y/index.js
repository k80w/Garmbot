const debug = require("debug")("garmbot:module:poopd4y"),
	Discord = require("discord.js");

module.exports = function(garmbot) {
	garmbot.addCommand(["isitpoopday", "isitpoopdayyet"], async function(message) {
		debug("Checking to see if it's poop day");
		let date = new Date();

		let embed = new Discord.RichEmbed();

		if (date.getDate() <= 7 && date.getDay() === 1) { // Is it the first Monday of the month?
			embed
				.setTitle("It's poop day!")
				.setDescription("Congration u won!");
		} else {
			embed
				.setTitle("It's not poop day ;-;")
				.setDescription("im so sorry :(");
		}

		return message.channel.sendEmbed(embed, message.author.toString());
	});
};