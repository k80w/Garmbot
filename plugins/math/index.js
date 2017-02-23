const debug = require("debug")("garmbot:modules:math"),
	Discord = require("discord.js");

module.exports = function(garmbot) {
	garmbot.addCommand(["round"], async function(message, args) {
		let numToRound = args.trim();
		let embed = new Discord.RichEmbed();
		embed
			.setTitle("Rounded number!")
			.setDescription(Math.round(numToRound))
		return message.channel.sendEmbed(embed, message.author.toString());
	});
}