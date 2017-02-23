const debug = require("debug")("garmbot:modules:math"),
	Discord = require("discord.js");

module.exports = function(garmbot) {
	garmbot.addCommand(["round"], async function(message, args) {
		var num = Number(args.trim());
		if (num == undefined) {
			let embed = new Discord.RichEmbed()
				.setTitle("Rounded number!")
				.setDescription("You didn't specify a number!");
			return message.channel.sendEmbed(embed, message.author.toString());
		} else {
			let embed = new Discord.RichEmbed()
				.setTitle("Rounded number!")
				.setDescription(Math.round(num))
			return message.channel.sendEmbed(embed, message.author.toString());
		}
	});
}