const debug = require("debug")("garmbot:modules:math"),
	Discord = require("discord.js");

module.exports = function(garmbot) {
	garmbot.addCommand(["round"], async function(message, args) {
		let embed = new Discord.RichEmbed()
			.setTitle("Rounded number!")
			.setDescription(Math.round(Number(args.trim())))
		return message.channel.sendEmbed(embed, message.author.toString());
	});
}